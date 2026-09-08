import { useState } from 'react'
import { RootCauseFormModal } from '../components/RootCauseFormModal'
import { useCollectionData } from '../hooks/useCollectionData'
import { peopleCol, rootCausesCol, ticketsCol } from '../lib/firestore/collections'
import { ROOT_CAUSE_STATUS_LABELS, SOURCE_SYSTEM_LABELS, type RootCause } from '../lib/types'

const statusBadge: Record<string, string> = {
  identificado: 'bg-slate-100 text-slate-600',
  en_analisis: 'bg-amber-50 text-amber-700',
  en_solucion: 'bg-blue-50 text-blue-700',
  resuelto: 'bg-emerald-50 text-emerald-700',
}

export function RootCausesPage() {
  const { data: rootCauses, loading } = useCollectionData(rootCausesCol, 'firstSeenAt')
  const { data: tickets } = useCollectionData(ticketsCol)
  const { data: people } = useCollectionData(peopleCol)

  const [showNew, setShowNew] = useState(false)
  const [editing, setEditing] = useState<RootCause | null>(null)

  const personName = (id: string) => people.find((p) => p.id === id)?.name ?? id

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Casos raíz</h1>
          <p className="text-sm text-slate-500">
            Problemas de fondo agrupando los tickets que son síntoma del mismo caso.
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          + Nuevo caso raíz
        </button>
      </div>

      <div className="space-y-4">
        {rootCauses.map((rc) => {
          const linkedTickets = tickets.filter((t) => t.rootCauseId === rc.id)

          return (
            <div key={rc.id} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-medium text-slate-900">{rc.title}</h2>
                  <p className="mt-1 text-sm text-slate-600">{rc.description}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[rc.status]}`}
                  >
                    {ROOT_CAUSE_STATUS_LABELS[rc.status]}
                  </span>
                  <button
                    onClick={() => setEditing(rc)}
                    className="text-xs font-medium text-slate-500 hover:text-slate-900"
                  >
                    Editar
                  </button>
                </div>
              </div>

              {rc.analysis && (
                <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
                  <span className="font-medium text-slate-700">Análisis: </span>
                  {rc.analysis}
                </p>
              )}

              {rc.solution && (
                <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
                  <span className="font-medium">Solución: </span>
                  {rc.solution}
                </p>
              )}

              <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                <span>Responsable: {personName(rc.owner)}</span>
                <span>{linkedTickets.length} tickets vinculados</span>
              </div>

              {linkedTickets.length > 0 && (
                <ul className="mt-3 divide-y divide-slate-100 border-t border-slate-100 pt-2 text-sm">
                  {linkedTickets.map((t) => (
                    <li key={t.id} className="flex justify-between py-1.5">
                      <span className="text-slate-700">{t.title}</span>
                      <span className="text-xs text-slate-400">
                        {SOURCE_SYSTEM_LABELS[t.sourceSystem]} · {t.sourceId}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}

        {!loading && rootCauses.length === 0 && (
          <p className="text-sm text-slate-400">
            Todavía no hay casos raíz creados. También podés crear uno desde un
            ticket, al vincularlo.
          </p>
        )}
      </div>

      {showNew && (
        <RootCauseFormModal people={people} onClose={() => setShowNew(false)} />
      )}
      {editing && (
        <RootCauseFormModal
          rootCause={editing}
          people={people}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
