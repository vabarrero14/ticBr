import { addDoc, doc, increment, runTransaction, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import type { Ticket } from '../types'
import { ticketsCol } from './collections'

export type NewTicketInput = Omit<
  Ticket,
  'id' | 'createdAt' | 'updatedAt' | 'closedAt'
>

export async function createTicket(input: NewTicketInput) {
  const now = new Date().toISOString()
  await addDoc(ticketsCol, {
    ...input,
    id: '', // ignorado por el converter al escribir
    createdAt: now,
    updatedAt: now,
    closedAt: null,
  })
}

export async function updateTicket(
  ticketId: string,
  changes: Partial<Omit<Ticket, 'id' | 'createdAt'>>,
) {
  const ref = doc(db, 'tickets', ticketId)
  await updateDoc(ref, {
    ...changes,
    updatedAt: new Date().toISOString(),
  })
}

/**
 * Vincula un ticket a un caso raíz (o lo crea sobre la marcha si `newRootCause`
 * viene con datos), manteniendo `linkedTicketsCount` consistente. Si el ticket
 * ya estaba vinculado a otro caso raíz, le resta el conteo.
 */
export async function linkTicketToRootCause(
  ticketId: string,
  previousRootCauseId: string | null,
  rootCauseId: string,
) {
  await runTransaction(db, async (tx) => {
    const ticketRef = doc(db, 'tickets', ticketId)
    tx.update(ticketRef, {
      rootCauseId,
      updatedAt: new Date().toISOString(),
    })

    const newRcRef = doc(db, 'rootCauses', rootCauseId)
    tx.update(newRcRef, { linkedTicketsCount: increment(1) })

    if (previousRootCauseId && previousRootCauseId !== rootCauseId) {
      const prevRcRef = doc(db, 'rootCauses', previousRootCauseId)
      tx.update(prevRcRef, { linkedTicketsCount: increment(-1) })
    }
  })
}

export async function unlinkTicketFromRootCause(
  ticketId: string,
  rootCauseId: string,
) {
  await runTransaction(db, async (tx) => {
    const ticketRef = doc(db, 'tickets', ticketId)
    tx.update(ticketRef, {
      rootCauseId: null,
      updatedAt: new Date().toISOString(),
    })

    const rcRef = doc(db, 'rootCauses', rootCauseId)
    tx.update(rcRef, { linkedTicketsCount: increment(-1) })
  })
}
