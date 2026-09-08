import {
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  increment,
  query,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { ParsedPoRow } from '../poImport/parseConsolidado'
import { normalizeText } from '../textUtils'
import { importBatchesCol, peopleCol, ticketsCol } from './collections'
import { createTicket, type NewTicketInput } from './tickets'

export interface ImportPoOptions {
  fileName: string
  sheetName: string
  createdBy: string
}

export interface ImportPoResult {
  batchId: string
  rowsFound: number
  rowsImported: number
  rowsSkipped: number
  personsCreated: number
}

const norm = normalizeText

/**
 * Vuelca las filas ya parseadas de la planilla PO a Firestore:
 * 1. Crea las personas (solo Analista/Técnico — quien ejecuta el ticket en
 *    TIC, no Dueño ni Jefe TIC) que todavía no existan en `people`,
 *    buscando por nombre (tolerante a mayúsculas y tildes).
 * 2. Salta las filas cuyo `po.nroPedido` ya existe en algún ticket
 *    (permite reimportar una versión más nueva del mismo archivo sin duplicar).
 * 3. Crea un ticket por fila restante, con sourceSystem "clickup_po" y
 *    workType "proyecto_po", y un documento en `importBatches` con el resumen.
 */
export async function importPoRows(
  rows: ParsedPoRow[],
  options: ImportPoOptions,
): Promise<ImportPoResult> {
  const [peopleSnapshot, existingTicketsSnapshot] = await Promise.all([
    getDocs(peopleCol),
    getDocs(query(ticketsCol, where('sourceSystem', '==', 'clickup_po'))),
  ])

  const peopleByName = new Map(peopleSnapshot.docs.map((d) => [norm(d.data().name), d.data().id]))
  const existingNroPedidos = new Set(
    existingTicketsSnapshot.docs
      .map((d) => d.data().po?.nroPedido)
      .filter((n): n is number => n !== undefined),
  )

  let personsCreated = 0
  // Filas del mismo chunk (o de chunks distintos) pueden compartir un nombre
  // nuevo (ej: el mismo Dueño en varias filas) — se memoiza la promesa de
  // creación por nombre para no crear personas duplicadas por la carrera.
  const personCreationPromises = new Map<string, Promise<string>>()
  function personId(name: string | undefined): Promise<string | undefined> | undefined {
    if (!name) return undefined
    const key = norm(name)
    const existing = peopleByName.get(key)
    if (existing) return Promise.resolve(existing)
    const inFlight = personCreationPromises.get(key)
    if (inFlight) return inFlight
    const promise = addDoc(peopleCol, { id: '', name, email: '', active: true }).then((ref) => {
      peopleByName.set(key, ref.id)
      personsCreated++
      return ref.id
    })
    personCreationPromises.set(key, promise)
    return promise
  }

  const toImport = rows.filter(
    (r) => r.po.nroPedido === undefined || !existingNroPedidos.has(r.po.nroPedido),
  )
  const skipped = rows.length - toImport.length

  const now = new Date().toISOString()
  const batchRef = await addDoc(importBatchesCol, {
    id: '',
    fileName: options.fileName,
    sourceSheet: options.sheetName,
    rowsFound: rows.length,
    rowsImported: 0, // se corrige abajo con updateDoc una vez que sabemos cuántas entraron bien
    rowsSkipped: skipped,
    createdAt: now,
    createdBy: options.createdBy,
  })

  let imported = 0
  const concurrency = 8
  for (let i = 0; i < toImport.length; i += concurrency) {
    const chunk = toImport.slice(i, i + concurrency)
    await Promise.all(
      chunk.map(async (row) => {
        const assigneeIds = await Promise.all(row.assigneeNames.map((n) => personId(n)))
        const uniqueAssignees = Array.from(
          new Set(assigneeIds.filter((id): id is string => Boolean(id))),
        )

        const tags = [row.po.sistema, row.po.pilar, row.po.tipoPoAdicional].filter(
          (t): t is string => Boolean(t),
        )

        const input: NewTicketInput = {
          sourceSystem: 'clickup_po',
          sourceId: row.po.nroPedido !== undefined ? `PO-${row.po.nroPedido}` : `PO-fila-${row.rowNumber}`,
          title: row.title,
          description: row.po.meta ?? '',
          workType: 'proyecto_po',
          status: row.status,
          priority: row.priority,
          assignees: uniqueAssignees,
          area: row.gerencia,
          rootCauseId: null,
          tags,
          importedBatchId: batchRef.id,
          po: row.po,
          log: row.log.length > 0 ? row.log : undefined,
        }
        await createTicket(input)
        imported++
      }),
    )
  }

  await updateDoc(doc(db, 'importBatches', batchRef.id), { rowsImported: imported })

  return {
    batchId: batchRef.id,
    rowsFound: rows.length,
    rowsImported: imported,
    rowsSkipped: skipped,
    personsCreated,
  }
}

export interface ResetPoImportResult {
  deletedTickets: number
  deletedBatches: number
}

/**
 * Borra todos los tickets importados de PO (sourceSystem "clickup_po") y los
 * registros de `importBatches`, para poder reimportar limpio con una lógica
 * corregida — el dedupe por Nro Pedido, si no, salta todo por "ya existe".
 * No borra las personas creadas por importaciones anteriores (podrían estar
 * asignadas a otras cosas); esas se limpian a mano en Personas si sobran.
 */
export async function resetPoImport(): Promise<ResetPoImportResult> {
  const [ticketsSnap, batchesSnap] = await Promise.all([
    getDocs(query(ticketsCol, where('sourceSystem', '==', 'clickup_po'))),
    getDocs(importBatchesCol),
  ])

  // Si alguno de estos tickets ya se había vinculado a mano a un caso raíz,
  // hay que descontarlo para no dejar linkedTicketsCount inflado.
  const rootCauseDecrements = new Map<string, number>()
  for (const d of ticketsSnap.docs) {
    const rootCauseId = d.data().rootCauseId
    if (rootCauseId) {
      rootCauseDecrements.set(rootCauseId, (rootCauseDecrements.get(rootCauseId) ?? 0) + 1)
    }
  }

  await Promise.all([
    ...ticketsSnap.docs.map((d) => deleteDoc(d.ref)),
    ...batchesSnap.docs.map((d) => deleteDoc(d.ref)),
    ...Array.from(rootCauseDecrements.entries()).map(([id, count]) =>
      updateDoc(doc(db, 'rootCauses', id), { linkedTicketsCount: increment(-count) }),
    ),
  ])

  return { deletedTickets: ticketsSnap.size, deletedBatches: batchesSnap.size }
}
