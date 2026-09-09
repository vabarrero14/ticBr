// Modelo de datos unificado — ver docs/PROJECT_PROMPT.md

/**
 * Plataforma donde se GESTIONA/trackea el ticket (Redmine, Century,
 * ClickUp/Excel PO, herramientas de Innovación). OJO: no es el sistema
 * donde ocurre el incidente — para eso está `Ticket.originSystem`.
 */
export type SourceSystem = 'redmine' | 'century' | 'clickup_po' | 'innovacion'

/**
 * Tipo de trabajo — texto libre a propósito: para tickets de PO viene tal
 * cual de la columna "TIPO PO/Adicional" de la planilla (PO 2026, Adicional,
 * INNO, etc.), que no es una lista cerrada y puede sumar valores nuevos en
 * futuras versiones del archivo. `WORK_TYPE_PRESETS` da sugerencias para
 * cuando se carga un ticket a mano.
 */
export type WorkType = string

/**
 * Categoría de un ticket marcado para el tablero mensual (ver
 * `Ticket.board` / `Ticket.boardCategory`): aspecto a destacar o a mejorar.
 */
export type BoardCategory = 'destacar' | 'mejorar'

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
 * Un evento del historial de seguimiento de un ticket. Lo llena tanto el
 * importador de PO (parsea las columnas con fecha de la planilla
 * "Consolidado" — esas entradas no tienen `author`) como los comentarios
 * cargados a mano desde la app para cualquier ticket.
 */
export interface TicketLogEntry {
  /** Tal cual viene de la planilla, o fecha/hora de carga si es manual. */
  date: string
  note: string
  /** Quién lo cargó — solo presente en entradas agregadas desde la app. */
  author?: string
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
  /** Jefe TIC a cargo — dato de contexto, usado para el filtro de alcance. */
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

export interface Ticket {
  id: string
  sourceSystem: SourceSystem
  sourceId: string
  sourceUrl?: string
  title: string
  description: string
  workType: WorkType
  /**
   * Sistema donde se origina el incidente/trabajo (SAP, B-POS,
   * Infraestructura, HW, Telefonía, etc.) — distinto de `sourceSystem`
   * (dónde se gestiona el ticket). Texto libre por el mismo motivo que
   * `workType`: para tickets de PO viene de la columna "Sistema" de la
   * planilla, que no es una lista cerrada.
   */
  originSystem?: string
  status: TicketStatus
  priority: Priority
  assignees: string[] // Person.id[] — quién EJECUTA el ticket en TIC
  /** Gerencia responsable del negocio (no de quién lo ejecuta). */
  area?: string
  /**
   * Responsable de negocio ("Dueño" de la planilla PO) — texto libre, no
   * necesariamente alguien registrado en `people`. Distinto de `assignees`:
   * es quien pidió/es dueño del tema del lado del negocio, no quien lo
   * lleva adelante en TIC.
   */
  businessOwner?: string
  rootCauseId: string | null
  createdAt: string // ISO date
  updatedAt: string
  closedAt?: string | null
  tags: string[]
  importedBatchId?: string | null
  po?: PoDetails
  log?: TicketLogEntry[]
  /** Marcado como tema para el tablero mensual (destacados/lecciones aprendidas). */
  board?: boolean
  /** Solo tiene sentido si `board` es true. */
  boardCategory?: BoardCategory
  /** Mes en que se presenta/presentó este tema, formato "YYYY-MM". Solo
   * tiene sentido si `board` es true — permite ver el historial de qué se
   * presentó cada mes en vez de perderlo al desmarcar. */
  boardMonth?: string
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

/**
 * Sugerencias de tipo para cuando se carga un ticket a mano (datalist, no
 * lista cerrada). El default según plataforma lo resuelve
 * `defaultWorkTypeFor` en TicketFormModal.
 */
export const WORK_TYPE_PRESETS = [
  'Operativo',
  'SAP',
  'Proyecto PO',
  'Proyecto de Innovación',
] as const

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

export const BOARD_CATEGORY_LABELS: Record<BoardCategory, string> = {
  destacar: 'Aspecto a destacar',
  mejorar: 'Aspecto a mejorar',
}
