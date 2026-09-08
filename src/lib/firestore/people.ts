import { addDoc, getDocs, limit, query, where } from 'firebase/firestore'
import type { Person } from '../types'
import { peopleCol } from './collections'

export type NewPersonInput = Omit<Person, 'id'>

export async function createPerson(input: NewPersonInput) {
  const ref = await addDoc(peopleCol, { ...input, id: '' })
  return ref.id
}

/**
 * Modelo híbrido: si el usuario que acaba de loguearse con Google no tiene
 * todavía un registro en `people` (buscado por email), se lo crea automáticamente
 * a partir de su perfil de Google. Esto NO reemplaza la carga manual de personas
 * que no usan la app (ej: equipo SAP, PO) — solo evita tener que autoregistrarte
 * a mano cada vez que alguien nuevo entra por primera vez.
 */
export async function ensurePersonForUser(user: {
  email: string | null
  displayName: string | null
}) {
  if (!user.email) return

  const existing = await getDocs(
    query(peopleCol, where('email', '==', user.email), limit(1)),
  )
  if (!existing.empty) return

  await createPerson({
    name: user.displayName || user.email,
    email: user.email,
    active: true,
  })
}
