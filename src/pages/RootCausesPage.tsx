import { mockPeople, mockRootCauses, mockTickets } from '../lib/mockData'
import { ROOT_CAUSE_STATUS_LABELS, SOURCE_SYSTEM_LABELS } from '../lib/types'

const statusBadge: Record<string, string> = {
  identificado: 'bg-slate-100 text-slate-600',
  en_analisis: 'bg-amber-50 text-amber-700',
  en_solucion: 'bg-blue-50 text-blue-700',
  resuelto: 'bg-emerald-50 text-emerald-700',
}

export function RootCausesPage() {
  const personName = (id: string) =>
    mockPeople.find((p) => p.id === id)?.name ?? id

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Casos raíz</h1>
        <p className="text-sm text-slate-500">
          Problemas de fondo agrupando los tickets que son síntoma del mismo caso.
        </p>
      </div>

      <div className="space-y-4">
        {mockRootCauses.map((rc) => {
          const linkedTickets = mockTickets.filter((t) => t.rootCauseId === rc.id)

          return (
            <div key={rc.id} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-medium text-slate-900">{rc.title}</h2>
                  <p className="mt-1 text-sm text-slate-600">{rc.description}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[rc.status]}`}
                >
                  {ROOT_CAUSE_STATUS_LABELS[rc.status]}
                </span>
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
            </div>
          )
        })}

        {mockRootCauses.length === 0 && (
          <p className="text-sm text-slate-400">Todavía no hay casos raíz creados.</p>
        )}
      </div>
    </div>
  )
}
