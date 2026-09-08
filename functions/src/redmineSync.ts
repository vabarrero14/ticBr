import { getFirestore } from 'firebase-admin/firestore'
import mysql from 'mysql2/promise'
import { normalizeText } from './textUtils.js'

/**
 * Equipo cuyos tickets abiertos de Redmine se traen a ticBr. Para sumar o
 * sacar gente, editar esta lista (nombre y apellido, como figuran en
 * Redmine) y volver a desplegar (`npm --prefix functions run deploy`).
 */
export const TRACKED_NAMES = [
  'Raul Peralta',
  'Dina Insfran',
  'Angel Lenguaza',
  'Mario Cubelli',
  'Eduardo Avila',
  'Jorge Clarice',
  'Alcides Gonzalez',
]

export interface RedmineDbConfig {
  host: string
  port: number
  database: string
  user: string
  password: string
}

export interface SyncResult {
  usersMatched: number
  unmatchedNames: string[]
  issuesSynced: number
  issuesClosedNow: number
}

function normalizeStatus(name: string | null): string {
  const v = normalizeText(name)
  if (!v) return 'abierto'
  if (v.includes('resuelt') || v.includes('resolved')) return 'resuelto'
  if (v.includes('cerrad') || v.includes('closed') || v.includes('rechaz') || v.includes('rejected'))
    return 'cerrado'
  if (v.includes('progres') || v.includes('curso')) return 'en_progreso'
  if (v.includes('feedback') || v.includes('pendient') || v.includes('espera') || v.includes('hold'))
    return 'bloqueado'
  return 'abierto'
}

function normalizePriority(name: string | null): string {
  const v = normalizeText(name)
  if (v.includes('baja') || v.includes('low')) return 'baja'
  if (v.includes('alta') || v.includes('high')) return 'alta'
  if (v.includes('urgent') || v.includes('inmediat') || v.includes('critic')) return 'critica'
  return 'media'
}

function toIso(value: unknown): string | undefined {
  if (!value) return undefined
  const d = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString()
}

/**
 * Sincroniza los issues ABIERTOS de Redmine asignados a `TRACKED_NAMES`
 * hacia la colección `tickets` de Firestore (sourceSystem: 'redmine',
 * doc id determinístico `redmine-<issue id>` para que reimportar actualice
 * en vez de duplicar). Los tickets que ya estaban sincronizados como
 * abiertos y dejaron de aparecer en el resultado (se cerraron en Redmine)
 * se marcan `resuelto`.
 *
 * Solo toca los campos que vienen de Redmine (título, estado, prioridad,
 * etc.) — nunca pisa `rootCauseId`, `board*` ni `tags` de un ticket ya
 * existente, así no se pierde nada que se haya cargado a mano en ticBr.
 */
export async function syncRedmineIssues(config: RedmineDbConfig): Promise<SyncResult> {
  const db = getFirestore()
  const conn = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
    connectTimeout: 10_000,
  })

  try {
    // 1. Matchear los nombres trackeados contra la tabla de usuarios de Redmine.
    const [userRows] = await conn.query<mysql.RowDataPacket[]>(
      'SELECT id, firstname, lastname FROM users WHERE status = 1',
    )
    const targetByNormName = new Map(TRACKED_NAMES.map((n) => [normalizeText(n), n]))
    const redmineIdByNormName = new Map<string, number>()
    for (const row of userRows) {
      const full = normalizeText(`${row.firstname} ${row.lastname}`)
      if (targetByNormName.has(full)) redmineIdByNormName.set(full, row.id as number)
    }
    const unmatchedNames = TRACKED_NAMES.filter((n) => !redmineIdByNormName.has(normalizeText(n)))
    const redmineIds = Array.from(redmineIdByNormName.values())

    if (redmineIds.length === 0) {
      return { usersMatched: 0, unmatchedNames, issuesSynced: 0, issuesClosedNow: 0 }
    }

    // 2. Matchear/crear la Persona en Firestore para cada nombre encontrado
    //    (mismo criterio que el importador de PO: buscar por nombre
    //    tolerante a tildes, crear si no existe).
    const peopleSnap = await db.collection('people').get()
    const personIdByNormName = new Map(
      peopleSnap.docs.map((d) => [normalizeText(d.get('name') as string), d.id]),
    )
    const personIdByRedmineId = new Map<number, string>()
    for (const [normName, redmineId] of redmineIdByNormName) {
      let personId = personIdByNormName.get(normName)
      if (!personId) {
        const ref = await db
          .collection('people')
          .add({ name: targetByNormName.get(normName), email: '', active: true })
        personId = ref.id
        personIdByNormName.set(normName, personId)
      }
      personIdByRedmineId.set(redmineId, personId)
    }

    // 3. Issues abiertos asignados a esa gente.
    const placeholders = redmineIds.map(() => '?').join(',')
    const [issueRows] = await conn.query<mysql.RowDataPacket[]>(
      `SELECT i.id, i.subject, i.description, i.assigned_to_id, i.created_on, i.updated_on,
              s.name AS status_name,
              e.name AS priority_name,
              p.name AS project_name,
              t.name AS tracker_name
       FROM issues i
       JOIN issue_statuses s ON s.id = i.status_id
       LEFT JOIN enumerations e ON e.id = i.priority_id
       LEFT JOIN projects p ON p.id = i.project_id
       LEFT JOIN trackers t ON t.id = i.tracker_id
       WHERE i.assigned_to_id IN (${placeholders}) AND s.is_closed = 0`,
      redmineIds,
    )

    const now = new Date().toISOString()
    const openSourceIds = new Set<string>()

    for (const row of issueRows) {
      const sourceId = `RM-${row.id}`
      openSourceIds.add(sourceId)
      const personId = personIdByRedmineId.get(row.assigned_to_id as number)

      const synced: Record<string, unknown> = {
        sourceSystem: 'redmine',
        sourceId,
        sourceUrl: `https://${config.host}/issues/${row.id}`,
        title: row.subject ?? sourceId,
        description: row.description ?? '',
        workType: 'Operativo',
        status: normalizeStatus(row.status_name as string | null),
        priority: normalizePriority(row.priority_name as string | null),
        assignees: personId ? [personId] : [],
        area: row.project_name ?? undefined,
        tags: [row.tracker_name].filter((v): v is string => Boolean(v)),
        updatedAt: toIso(row.updated_on) ?? now,
      }

      const ref = db.collection('tickets').doc(`redmine-${row.id}`)
      const existing = await ref.get()
      if (existing.exists) {
        await ref.update(synced)
      } else {
        await ref.set({
          ...synced,
          rootCauseId: null,
          createdAt: toIso(row.created_on) ?? now,
          importedBatchId: null,
          board: false,
        })
      }
    }

    // 4. Lo que ya estaba sincronizado como abierto y no vino esta vez -> se cerró en Redmine.
    const previouslyOpenSnap = await db
      .collection('tickets')
      .where('sourceSystem', '==', 'redmine')
      .where('status', 'in', ['abierto', 'en_progreso', 'bloqueado'])
      .get()

    let issuesClosedNow = 0
    const closeWrites: Promise<unknown>[] = []
    for (const doc of previouslyOpenSnap.docs) {
      const sourceId = doc.get('sourceId') as string
      if (!openSourceIds.has(sourceId)) {
        issuesClosedNow++
        closeWrites.push(doc.ref.update({ status: 'resuelto', updatedAt: now }))
      }
    }
    await Promise.all(closeWrites)

    return {
      usersMatched: redmineIds.length,
      unmatchedNames,
      issuesSynced: issueRows.length,
      issuesClosedNow,
    }
  } finally {
    await conn.end()
  }
}
