import {
  Timestamp,
  type FirestoreDataConverter,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'

/**
 * Crea un FirestoreDataConverter genérico para un tipo `T` cuyo id de documento
 * es `T['id']`. Los campos de fecha listados en `dateFields` se guardan como
 * Firestore Timestamp y se exponen en la app como string ISO.
 */
export function makeConverter<T extends { id: string }>(
  dateFields: (keyof T)[] = [],
): FirestoreDataConverter<T> {
  return {
    toFirestore(data: T) {
      const { id: _id, ...rest } = data as Record<string, unknown> & { id: string }
      const out: Record<string, unknown> = { ...rest }
      for (const field of dateFields) {
        const value = out[field as string]
        if (typeof value === 'string') {
          out[field as string] = Timestamp.fromDate(new Date(value))
        }
      }
      return out
    },
    fromFirestore(snapshot: QueryDocumentSnapshot) {
      const data = snapshot.data()
      const out: Record<string, unknown> = { ...data, id: snapshot.id }
      for (const field of dateFields) {
        const value = out[field as string]
        if (value instanceof Timestamp) {
          out[field as string] = value.toDate().toISOString()
        }
      }
      return out as T
    },
  }
}
