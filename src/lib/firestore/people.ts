import { addDoc, deleteDoc, doc, getDocs, limit, query, updateDoc, where } from 'firebase/firestore'
import { db } from '../firebase'
import type { Person } from '../types'
import { peopleCol, rootCausesCol, ticketsCol } from './collections'

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

/** Borra una persona. Llamar solo cuando no está en uso (ver PeoplePage) —
 * si tiene tickets o casos raíz asignados, esos quedarían con un id
 * "colgado" apuntando a nadie. Para eso está `mergePeople`. */
export async function deletePerson(personId: string) {
  await deleteDoc(doc(db, 'people', personId))
}

/**
 * Fusiona `sourceId` en `targetId`: reasigna todos los tickets (assignees)
 * y casos raíz (owner) que apuntaban a `sourceId` para que apunten a
 * `targetId`, y borra a `sourceId`. Útil para unificar duplicados como
 * "Dina" y "Dina Insfran".
 */
export async function mergePeople(sourceId: string, targetId: string) {
  if (sourceId === targetId) return

  const [ticketsSnap, rootCausesSnap] = await Promise.all([
    getDocs(query(ticketsCol, where('assignees', 'array-contains', sourceId))),
    getDocs(query(rootCausesCol, where('owner', '==', sourceId))),
  ])

  await Promise.all([
    ...ticketsSnap.docs.map((d) => {
      const assignees = Array.from(
        new Set(d.data().assignees.map((a) => (a === sourceId ? targetId : a))),
      )
      return updateDoc(doc(db, 'tickets', d.id), { assignees })
    }),
    ...rootCausesSnap.docs.map((d) => updateDoc(doc(db, 'rootCauses', d.id), { owner: targetId })),
  ])

  await deletePerson(sourceId)
}
