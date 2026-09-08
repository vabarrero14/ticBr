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
