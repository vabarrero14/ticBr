import { onSnapshot, orderBy, query, type Query } from 'firebase/firestore'
import { useEffect, useState } from 'react'

/**
 * Suscribe en tiempo real a una colección de Firestore ya tipada (con
 * `.withConverter(...)` aplicado) y devuelve sus documentos.
 */
export function useCollectionData<T>(
  baseQuery: Query<T>,
  orderByField?: string,
) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const q = orderByField ? query(baseQuery, orderBy(orderByField, 'desc')) : baseQuery

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setData(snapshot.docs.map((doc) => doc.data()))
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      },
    )

    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseQuery, orderByField])

  return { data, loading, error }
}
