import { addDoc } from 'firebase/firestore'
import type { Person } from '../types'
import { peopleCol } from './collections'

export type NewPersonInput = Omit<Person, 'id'>

export async function createPerson(input: NewPersonInput) {
  const ref = await addDoc(peopleCol, { ...input, id: '' })
  return ref.id
}
