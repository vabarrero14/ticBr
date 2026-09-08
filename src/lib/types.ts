// Modelo de datos unificado — ver docs/PROJECT_PROMPT.md

export type SourceSystem = 'redmine' | 'century' | 'clickup_po' | 'innovacion'

export type WorkType = 'operativo' | 'sap' | 'proyecto_po' | 'innovacion'

export type TicketStatus =
  | 'abierto'
  | 'en_progreso'
  | 'bloqueado'
  | 'resuelto'
  | 'cerrado'

export type Priority = 'baja' | 'media' | 'alta' | 'critica'

export type RootCauseStatus =
  | 'identificado'
  | 'en_analisis'
  | 'en_solucion'
  | 'resuelto'

export interface Person {
  id: string
  name: string
  email: string
  area?: string
  active: boolean
}

/**
 * Un evento del historial de seguimiento de un ticket. Hoy solo lo llena el
 * importador de PO (parsea las columnas con fecha de la planilla "Consolidado"),
 * pero el modelo queda abierto para loguear eventos manuales más adelante.
 */
export interface TicketLogEntry {
  /** Tal cual viene de la planilla — a veces sin año, o con una aclaración. */
  date: string
  note: string
}

/**
 * Campos propios de un punto de la planificación PO (hoja "Consolidado" de la
 * planilla de Seguimiento de Proyectos PO). Todo opcional: un ticket que no
 * viene de esa planilla simplemente no tiene este bloque.
 */
export interface PoDetails {
  nroPedido?: number
  century?: string
  redmineTic?: string
  clickup?: string
  tipoPoAdicional?: string
  direccion?: string
  jefatura?: string
  /** Responsable de negocio (no es quien ejecuta el ticket en TIC). */
  dueno?: string
  /** Jefe TIC a cargo — dato de contexto, usado para el filtro de alcance. */
  jefeTic?: string
  sistema?: string
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

export interface Ticket {
  id: string
  sourceSystem: SourceSystem
  sourceId: string
  sourceUrl?: string
  title: string
  description: string
  workType: WorkType
  status: TicketStatus
  priority: Priority
  assignees: string[] // Person.id[]
  area?: string
  rootCauseId: string | null
  createdAt: string // ISO date
  updatedAt: string
  closedAt?: string | null
  tags: string[]
  importedBatchId?: string | null
  po?: PoDetails
  log?: TicketLogEntry[]
}

export interface RootCause {
  id: string
  title: string
  description: string
  analysis?: string
  status: RootCauseStatus
  owner: string // Person.id
  solution?: string
  linkedTicketsCount: number
  firstSeenAt: string
  resolvedAt?: string | null
}

export interface ImportBatch {
  id: string
  fileName: string
  sourceSheet: string
  rowsFound: number
  rowsImported: number
  rowsSkipped: number
  createdAt: string
  createdBy: string // email de quien importó
}

export const SOURCE_SYSTEM_LABELS: Record<SourceSystem, string> = {
  redmine: 'Redmine',
  century: 'Century',
  clickup_po: 'ClickUp / Excel PO',
  innovacion: 'Innovación',
}

export const WORK_TYPE_LABELS: Record<WorkType, string> = {
  operativo: 'Operativo',
  sap: 'SAP',
  proyecto_po: 'Proyecto PO',
  innovacion: 'Innovación',
}

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  abierto: 'Abierto',
  en_progreso: 'En progreso',
  bloqueado: 'Bloqueado',
  resuelto: 'Resuelto',
  cerrado: 'Cerrado',
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  critica: 'Crítica',
}

export const ROOT_CAUSE_STATUS_LABELS: Record<RootCauseStatus, string> = {
  identificado: 'Identificado',
  en_analisis: 'En análisis',
  en_solucion: 'En solución',
  resuelto: 'Resuelto',
}
