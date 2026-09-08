import { collection } from 'firebase/firestore'
import { db } from '../firebase'
import type { ImportBatch, Person, RootCause, Ticket } from '../types'
import { makeConverter } from './converters'

export const ticketConverter = makeConverter<Ticket>([
  'createdAt',
  'updatedAt',
  'closedAt',
])
export const rootCauseConverter = makeConverter<RootCause>([
  'firstSeenAt',
  'resolvedAt',
])
export const personConverter = makeConverter<Person>([])
export const importBatchConverter = makeConverter<ImportBatch>(['createdAt'])

export const ticketsCol = collection(db, 'tickets').withConverter(ticketConverter)
export const rootCausesCol = collection(db, 'rootCauses').withConverter(
  rootCauseConverter,
)
export const peopleCol = collection(db, 'people').withConverter(personConverter)
export const importBatchesCol = collection(db, 'importBatches').withConverter(
  importBatchConverter,
)
