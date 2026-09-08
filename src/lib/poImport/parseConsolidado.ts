import * as XLSX from 'xlsx'
import { normalizeText } from '../textUtils'
import type { Priority, TicketLogEntry, TicketStatus } from '../types'

export interface ParsedPoRow {
  rowNumber: number // fila real en la planilla, para mensajes de error/preview
  title: string
  status: TicketStatus
  statusRaw: string
  priority: Priority
  priorityRaw: string
  gerencia?: string
  /** Columna "Sistema" — sistema donde ocurre el incidente (SAP, B-POS,
   * Infraestructura, etc.), no la plataforma de gestión. */
  sistemaOrigen?: string
  dueno?: string
  jefeTic?: string
  analistaTecnico?: string
  /** Solo Analista/Técnico (quien realmente ejecuta el ticket en TIC),
   * separado si venían dos personas juntas en una celda tipo
   * "Raúl Peralta / Jorge Clarice", y deduplicado. Dueño y Jefe TIC son
   * datos de contexto (negocio/jefatura), no responsables de ejecución —
   * quedan en `po.dueno` / `po.jefeTic`, no acá. */
  assigneeNames: string[]
  po: {
    nroPedido?: number
    century?: string
    redmineTic?: string
    clickup?: string
    tipoPoAdicional?: string
    direccion?: string
    jefatura?: string
    dueno?: string
    jefeTic?: string
    solicitudFirmada?: string
    dfAlcance?: string
    actaPrueba?: string
    actaCierre?: string
    estimacionHoras?: number
    mesEjecucion?: string
    trimestre?: string
    tipoProveedor?: string
    responsableProveedor?: string
    pilar?: string
    proyecto?: string
    meta?: string
    proveedor?: string
    solProyecto?: string
    fechaLimite?: string
    observaciones?: string
  }
  log: TicketLogEntry[]
}

export interface ParseResult {
  sheetName: string
  headerRowNumber: number
  rows: ParsedPoRow[]
  warnings: string[]
}

// Headers esperados (tal cual figuran en la planilla) → campo de PoDetails.
// El primer match gana si el header aparece más de una vez en la fila.
const FIELD_HEADERS: Record<string, keyof ParsedPoRow['po']> = {
  'nro pedido': 'nroPedido',
  century: 'century',
  'redmine tic': 'redmineTic',
  clickup: 'clickup',
  'tipo po/adicional': 'tipoPoAdicional',
  dirección: 'direccion',
  direccion: 'direccion',
  jefatura: 'jefatura',
  'solicitud de requerimiento firmado': 'solicitudFirmada',
  'df/alcance': 'dfAlcance',
  'acta de prueba': 'actaPrueba',
  'acta de cierre': 'actaCierre',
  'mes de ejecución': 'mesEjecucion',
  'mes de ejecucion': 'mesEjecucion',
  trimestre: 'trimestre',
  'tipo proveedor': 'tipoProveedor',
  'responsable proveedor': 'responsableProveedor',
  pilar: 'pilar',
  proyecto: 'proyecto',
  meta: 'meta',
  proveedor: 'proveedor',
}

const norm = normalizeText

/** Separa celdas tipo "Ra\u00fal Peralta / Jorge Clarice" en nombres individuales. */
function splitNames(raw: string | undefined): string[] {
  if (!raw) return []
  return raw
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean)
}

function cellText(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined
  const text = value instanceof Date ? formatDate(value) : String(value).trim()
  return text === '' ? undefined : text
}

function cellNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : undefined
}

function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getFullYear()}`
}

function normalizeStatus(raw: string | undefined): { status: TicketStatus; matched: boolean } {
  const v = norm(raw)
  if (!v) return { status: 'abierto', matched: false }
  if (v.includes('termin')) return { status: 'resuelto', matched: true }
  if (v.includes('rechaz')) return { status: 'cerrado', matched: true }
  if (v.includes('proceso')) return { status: 'en_progreso', matched: true }
  if (v.includes('no inici')) return { status: 'abierto', matched: true }
  if (v.includes('pendient') || v.includes('aprob')) return { status: 'bloqueado', matched: true }
  return { status: 'abierto', matched: false }
}

function normalizePriority(raw: string | undefined): { priority: Priority; matched: boolean } {
  const v = norm(raw)
  if (v === 'baja') return { priority: 'baja', matched: true }
  if (v === 'media') return { priority: 'media', matched: true }
  if (v === 'alta') return { priority: 'alta', matched: true }
  if (v.includes('critic')) return { priority: 'critica', matched: true }
  return { priority: 'media', matched: false }
}

/**
 * Parsea el archivo .xlsx de "Seguimiento de Proyectos PO" (hoja "Consolidado").
 * Busca la hoja y la fila de encabezado por nombre de columna (no por letra fija),
 * para tolerar que en futuras versiones de la planilla se agreguen filas/columnas
 * arriba o se reordenen — mientras los nombres de columna se mantengan.
 */
export function parseConsolidadoWorkbook(buffer: ArrayBuffer): ParseResult {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true })
  const warnings: string[] = []

  const { sheet, sheetName, headerRowIndex } = findHeaderSheet(workbook)
  if (!sheet || headerRowIndex === -1) {
    throw new Error(
      'No se encontró una hoja con el formato esperado (una fila con columnas "Nro Pedido" y "Tarea"). ¿Es la planilla de Seguimiento de Proyectos PO?',
    )
  }

  const grid: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    raw: true,
    defval: null,
  })

  const headerRow = grid[headerRowIndex] ?? []
  const colOf = (headerName: string): number =>
    headerRow.findIndex((h) => norm(h) === norm(headerName))

  const colNroPedido = colOf('Nro Pedido')
  const colTarea = colOf('Tarea')
  const colGerencia = colOf('Gerencia')
  const colSistema = colOf('Sistema')
  const colDueno = colOf('Dueño')
  const colPrioridad = colOf('Prioridad')
  const colEstatus = colOf('ESTATUS')
  const colJefeTic = colOf('Jefe TIC')
  const colAnalista = colOf('Analista / Técnico')
  const colEstimacionHoras = headerRow.findIndex((h) => norm(h).startsWith('estimacion horas'))

  // Mapa nombre de header -> índice de columna, quedándose con la PRIMERA
  // aparición si el header se repite (ej: "Acta de Cierre" y "Proyecto" aparecen 2 veces).
  const fieldCols: Partial<Record<keyof ParsedPoRow['po'], number>> = {}
  headerRow.forEach((h, idx) => {
    const key = FIELD_HEADERS[norm(h)]
    if (key && fieldCols[key] === undefined) fieldCols[key] = idx
  })

  // Bloque final "Proyecto | Sol. Proyecto | Fecha Limite | <observaciones>":
  // se ubica por el segundo "Proyecto" y el "Sol. Proyecto" (únicos en la planilla),
  // así no dependemos del header de "observaciones" que en la fuente es literalmente
  // una fecha sin nombre fijo.
  const proyectoOccurrences = headerRow
    .map((h, idx) => (norm(h) === 'proyecto' ? idx : -1))
    .filter((idx) => idx !== -1)
  const colSolProyecto = colOf('Sol. Proyecto')
  const colFechaLimite = colOf('Fecha Limite')
  if (colSolProyecto !== -1) fieldCols.solProyecto = colSolProyecto
  if (colFechaLimite !== -1) fieldCols.fechaLimite = colFechaLimite
  if (colFechaLimite !== -1 && headerRow[colFechaLimite + 1] !== undefined) {
    fieldCols.observaciones = colFechaLimite + 1
  }

  // Columnas de "seguimiento" (bitácora fechada): todo lo que está entre el
  // último campo estructurado conocido y el segundo bloque "Proyecto".
  const colActaCierreOcurrencias = headerRow
    .map((h, idx) => (norm(h) === 'acta de cierre' ? idx : -1))
    .filter((idx) => idx !== -1)
  const logStart =
    colActaCierreOcurrencias.length > 0
      ? Math.max(...colActaCierreOcurrencias) + 1
      : (fieldCols.proveedor ?? -1) + 1
  const logEnd =
    proyectoOccurrences.length > 1 ? Math.max(...proyectoOccurrences) - 1 : headerRow.length - 1

  const logColumns: { index: number; label: string }[] = []
  if (logStart > 0 && logEnd >= logStart) {
    for (let c = logStart; c <= logEnd; c++) {
      const label = cellText(headerRow[c])
      if (label) logColumns.push({ index: c, label })
    }
  } else {
    warnings.push(
      'No se pudo ubicar el bloque de seguimiento fechado (columnas con fecha por encabezado); se importa todo lo demás igual.',
    )
  }

  if (colNroPedido === -1) warnings.push('No se encontró la columna "Nro Pedido".')
  if (colTarea === -1) throw new Error('No se encontró la columna "Tarea" (obligatoria).')

  const rows: ParsedPoRow[] = []
  let consecutiveEmpty = 0

  for (let r = headerRowIndex + 1; r < grid.length; r++) {
    const row = grid[r] ?? []
    const tarea = cellText(row[colTarea])
    const nroPedido = colNroPedido !== -1 ? cellNumber(row[colNroPedido]) : undefined

    if (!tarea && nroPedido === undefined) {
      consecutiveEmpty++
      if (consecutiveEmpty > 15) break // fin de los datos reales (el resto de la hoja está vacío hasta la fila 1000)
      continue
    }
    consecutiveEmpty = 0
    if (!tarea) continue // fila con Nro Pedido pero sin Tarea: no es un punto PO válido

    const statusRaw = colEstatus !== -1 ? cellText(row[colEstatus]) : undefined
    const priorityRaw = colPrioridad !== -1 ? cellText(row[colPrioridad]) : undefined
    const { status, matched: statusMatched } = normalizeStatus(statusRaw)
    const { priority, matched: priorityMatched } = normalizePriority(priorityRaw)
    if (statusRaw && !statusMatched) {
      warnings.push(`Fila ${r + 1}: estado "${statusRaw}" no reconocido, se importó como "Abierto".`)
    }
    if (priorityRaw && !priorityMatched) {
      warnings.push(`Fila ${r + 1}: prioridad "${priorityRaw}" no reconocida, se importó como "Media".`)
    }

    const po: ParsedPoRow['po'] = { nroPedido }
    for (const [key, idx] of Object.entries(fieldCols) as [keyof ParsedPoRow['po'], number][]) {
      if (key === 'nroPedido' || key === 'estimacionHoras') continue
      const text = cellText(row[idx])
      if (text) (po as Record<string, unknown>)[key] = text
    }
    if (colEstimacionHoras !== -1) {
      po.estimacionHoras = cellNumber(row[colEstimacionHoras])
    }

    const log: TicketLogEntry[] = []
    for (const { index, label } of logColumns) {
      const note = cellText(row[index])
      if (note) log.push({ date: label, note })
    }

    const dueno = colDueno !== -1 ? cellText(row[colDueno]) : undefined
    const jefeTic = colJefeTic !== -1 ? cellText(row[colJefeTic]) : undefined
    const analistaTecnico = colAnalista !== -1 ? cellText(row[colAnalista]) : undefined
    // Responsable de ejecución = solo Analista/Técnico. Dueño (negocio) y
    // Jefe TIC (jefatura) son contexto, no gente a la que se le "asigna" el
    // ticket — van a po.dueno / po.jefeTic.
    const assigneeNames = Array.from(new Set(splitNames(analistaTecnico)))
    if (dueno) po.dueno = dueno
    if (jefeTic) po.jefeTic = jefeTic

    rows.push({
      rowNumber: r + 1,
      title: tarea,
      status,
      statusRaw: statusRaw ?? '',
      priority,
      priorityRaw: priorityRaw ?? '',
      gerencia: colGerencia !== -1 ? cellText(row[colGerencia]) : undefined,
      sistemaOrigen: colSistema !== -1 ? cellText(row[colSistema]) : undefined,
      dueno,
      jefeTic,
      analistaTecnico,
      assigneeNames,
      po,
      log,
    })
  }

  warnings.push(...findPossibleDuplicateNames(rows))

  return { sheetName, headerRowNumber: headerRowIndex + 1, rows, warnings }
}

/**
 * La planilla suele tener nombres cortos ("Cesar", "Alcides") que en otras
 * filas aparecen completos ("Cesar Centurion", "Alcides Gonzalez"). No los
 * fusiono automáticamente (podría estar equivocándome), pero sí aviso para
 * que se unifiquen a mano en Personas si corresponde.
 */
function findPossibleDuplicateNames(rows: ParsedPoRow[]): string[] {
  const names = new Set<string>()
  for (const row of rows) for (const n of row.assigneeNames) names.add(n)

  const warnings: string[] = []
  const seen = new Set<string>()
  for (const a of names) {
    for (const b of names) {
      if (a === b || seen.has(`${b}|${a}`)) continue
      const shorter = a.length <= b.length ? a : b
      const longer = a.length <= b.length ? b : a
      if (norm(longer).startsWith(norm(shorter) + ' ')) {
        warnings.push(
          `Posible nombre duplicado: "${shorter}" y "${longer}" — revisar y unificar en Personas si es la misma persona.`,
        )
        seen.add(`${a}|${b}`)
      }
    }
  }
  return warnings
}

function findHeaderSheet(workbook: XLSX.WorkBook): {
  sheet: XLSX.WorkSheet | null
  sheetName: string
  headerRowIndex: number
} {
  const candidateNames = workbook.SheetNames.filter((n) => norm(n) === 'consolidado')
  const orderedNames = [...candidateNames, ...workbook.SheetNames.filter((n) => !candidateNames.includes(n))]

  for (const name of orderedNames) {
    const sheet = workbook.Sheets[name]
    if (!sheet) continue
    const grid: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: true,
      defval: null,
      range: 0,
    })
    for (let r = 0; r < Math.min(grid.length, 15); r++) {
      const row = grid[r] ?? []
      const hasNroPedido = row.some((c) => norm(c) === 'nro pedido')
      const hasTarea = row.some((c) => norm(c) === 'tarea')
      if (hasNroPedido && hasTarea) {
        return { sheet, sheetName: name, headerRowIndex: r }
      }
    }
  }
  return { sheet: null, sheetName: '', headerRowIndex: -1 }
}
