import type { Person, RootCause, Ticket } from './types'

// Datos de ejemplo para desarrollar la UI antes de conectar Firestore con datos reales.
// Reemplazar por lecturas a Firestore (colecciones `people`, `tickets`, `rootCauses`)
// una vez que el import/integración esté listo.

export const mockPeople: Person[] = [
  { id: 'p1', name: 'Valentina Barreto', email: 'vbarreto@empresa.com', area: 'PMO', active: true },
  { id: 'p2', name: 'Martín Gómez', email: 'mgomez@empresa.com', area: 'SAP', active: true },
  { id: 'p3', name: 'Laura Díaz', email: 'ldiaz@empresa.com', area: 'Innovación', active: true },
]

export const mockTickets: Ticket[] = [
  {
    id: 't1',
    sourceSystem: 'redmine',
    sourceId: 'RM-4821',
    sourceUrl: 'https://redmine.empresa.com/issues/4821',
    title: 'Error al facturar pedidos con múltiples depósitos',
    description: 'El proceso de facturación falla cuando el pedido tiene líneas de más de un depósito.',
    workType: 'operativo',
    status: 'en_progreso',
    priority: 'alta',
    assignees: ['p1'],
    area: 'Operaciones',
    rootCauseId: 'rc1',
    createdAt: '2026-08-20T10:00:00.000Z',
    updatedAt: '2026-09-02T15:30:00.000Z',
    tags: ['facturacion', 'depositos'],
  },
  {
    id: 't2',
    sourceSystem: 'century',
    sourceId: 'CTY-1092',
    title: 'Interfaz SAP-Century no sincroniza stock',
    description: 'La interfaz nocturna de stock no está trayendo las últimas actualizaciones de SAP.',
    workType: 'sap',
    status: 'bloqueado',
    priority: 'critica',
    assignees: ['p2'],
    area: 'SAP',
    rootCauseId: 'rc1',
    createdAt: '2026-08-25T08:00:00.000Z',
    updatedAt: '2026-09-05T09:00:00.000Z',
    tags: ['interfaz', 'stock'],
  },
  {
    id: 't3',
    sourceSystem: 'clickup_po',
    sourceId: 'PO-118',
    title: 'Definir alcance fase 2 del portal de clientes',
    description: 'Reunión con stakeholders para cerrar el alcance de la fase 2.',
    workType: 'proyecto_po',
    status: 'abierto',
    priority: 'media',
    assignees: ['p1'],
    area: 'PMO',
    rootCauseId: null,
    createdAt: '2026-09-01T12:00:00.000Z',
    updatedAt: '2026-09-01T12:00:00.000Z',
    tags: ['portal-clientes'],
  },
  {
    id: 't4',
    sourceSystem: 'innovacion',
    sourceId: 'INNOV-07',
    title: 'PoC de automatización con RPA para conciliaciones',
    description: 'Prueba de concepto para automatizar la conciliación diaria de pagos.',
    workType: 'innovacion',
    status: 'en_progreso',
    priority: 'media',
    assignees: ['p3'],
    area: 'Innovación',
    rootCauseId: null,
    createdAt: '2026-08-15T09:00:00.000Z',
    updatedAt: '2026-09-03T11:00:00.000Z',
    tags: ['rpa', 'conciliaciones'],
  },
  {
    id: 't5',
    sourceSystem: 'redmine',
    sourceId: 'RM-4899',
    sourceUrl: 'https://redmine.empresa.com/issues/4899',
    title: 'Factura duplicada al reintentar envío',
    description: 'Al reintentar el envío de una factura fallida, se genera un duplicado en vez de reutilizar la original.',
    workType: 'operativo',
    status: 'abierto',
    priority: 'alta',
    assignees: ['p1'],
    area: 'Operaciones',
    rootCauseId: 'rc1',
    createdAt: '2026-09-06T14:00:00.000Z',
    updatedAt: '2026-09-06T14:00:00.000Z',
    tags: ['facturacion'],
  },
]

export const mockRootCauses: RootCause[] = [
  {
    id: 'rc1',
    title: 'Inconsistencia de stock por depósito entre SAP y sistemas de facturación',
    description:
      'La interfaz SAP-Century no propaga correctamente el stock por depósito, lo que genera fallas de facturación y duplicados aguas abajo.',
    analysis:
      '5 Whys: la interfaz nocturna corta antes de procesar depósitos secundarios cuando el volumen supera cierto umbral, sin alertar el corte parcial.',
    status: 'en_analisis',
    owner: 'p2',
    linkedTicketsCount: 3,
    firstSeenAt: '2026-08-20T10:00:00.000Z',
  },
]
