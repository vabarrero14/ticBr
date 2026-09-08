import { addDoc, doc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import type { RootCause } from '../types'
import { rootCausesCol } from './collections'

export type NewRootCauseInput = Omit<
  RootCause,
  'id' | 'firstSeenAt' | 'resolvedAt' | 'linkedTicketsCount'
>

export async function createRootCause(input: NewRootCauseInput) {
  const ref = await addDoc(rootCausesCol, {
    ...input,
    id: '',
    firstSeenAt: new Date().toISOString(),
    resolvedAt: null,
    linkedTicketsCount: 0,
  })
  return ref.id
}

export async function updateRootCause(
  rootCauseId: string,
  changes: Partial<Omit<RootCause, 'id' | 'firstSeenAt' | 'linkedTicketsCount'>>,
) {
  const ref = doc(db, 'rootCauses', rootCauseId)
  await updateDoc(ref, { ...changes })
}
