import { useAuth } from '../context/AuthContext'
import type { Person } from '../lib/types'

/**
 * Atajo de un click para filtrar "solo mis tickets": busca la Persona que
 * corresponde al usuario logueado (por email) y, al activarse, pisa el
 * filtro de "Asignado" con su id. Requiere que el usuario ya tenga un
 * registro en `people` — lo tiene automático desde el primer login
 * (ver ensurePersonForUser), salvo que se haya fusionado/borrado a mano.
 */
export function MyTicketsToggle({
  people,
  assignee,
  onChange,
}: {
  people: Person[]
  assignee: string
  onChange: (value: string) => void
}) {
  const { user } = useAuth()
  const me = people.find((p) => p.email === user?.email)
  const active = Boolean(me) && assignee === me?.id

  return (
    <button
      type="button"
      disabled={!me}
      onClick={() => onChange(active ? '' : (me?.id ?? ''))}
      title={me ? undefined : 'No se te encontró en Personas todavía'}
      className={`rounded-md px-3 py-1.5 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? 'bg-slate-900 text-white'
          : 'border border-slate-300 text-slate-600 hover:bg-slate-100'
      }`}
    >
      {active ? '✓ Mis tickets' : 'Mis tickets'}
    </button>
  )
}
