import { Link } from 'react-router-dom'
import { JefeScopeSelector, inJefeScope } from '../components/JefeScopeSelector'
import { StatCard } from '../components/StatCard'
import { useCollectionData } from '../hooks/useCollectionData'
import { useJefeScope } from '../hooks/useJefeScope'
import { peopleCol, rootCausesCol, ticketsCol } from '../lib/firestore/collections'
import {
  SOURCE_SYSTEM_LABELS,
  WORK_TYPE_LABELS,
  type SourceSystem,
  type WorkType,
} from '../lib/types'

function countBy<T extends string>(items: T[]): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, key) => {
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})
}

export function DashboardPage() {
  const { data: allTickets, loading } = useCollectionData(ticketsCol)
  const { data: people } = useCollectionData(peopleCol)
  const { data: rootCauses } = useCollectionData(rootCausesCol)
  const [jefeScope, setJefeScope] = useJefeScope()

  const tickets = allTickets.filter((t) => inJefeScope(t, jefeScope))

  const openTickets = tickets.filter(
    (t) => t.status !== 'resuelto' && t.status !== 'cerrado',
  )
  const withoutRootCause = openTickets.filter((t) => t.rootCauseId === null)

  const bySystem = countBy(tickets.map((t) => t.sourceSystem))
  const byWorkType = countBy(tickets.map((t) => t.workType))
  const byPerson = countBy(tickets.flatMap((t) => t.assignees))

  const personName = (id: string) => people.find((p) => p.id === id)?.name ?? id

  // Recontar recurrencia de casos raíz sobre los tickets ya filtrados por
  // alcance, para no mezclar el conteo global guardado (linkedTicketsCount)
  // con una vista que puede estar mostrando solo un subconjunto de TIC.
  const rootCausesInScope = rootCauses
    .map((rc) => ({ rc, count: tickets.filter((t) => t.rootCauseId === rc.id).length }))
    .filter(({ count }) => count > 0)

  if (!loading && allTickets.length === 0) {
    return (
      <div className="space-y-2">
        <h1 className="text-lg font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500">
          Todavía no hay tickets cargados.{' '}
          <Link to="/tickets" className="font-medium text-slate-900 underline">
            Cargá el primero
          </Link>{' '}
          para empezar a ver métricas acá.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Vista unificada de Redmine, Century, ClickUp/Excel PO e Innovación.
          </p>
        </div>
        <JefeScopeSelector tickets={allTickets} value={jefeScope} onChange={setJefeScope} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Tickets totales" value={tickets.length} />
        <StatCard label="Abiertos" value={openTickets.length} />
        <StatCard label="Casos raíz activos" value={rootCausesInScope.length} />
        <StatCard
          label="Sin caso raíz vinculado"
          value={withoutRootCause.length}
          hint="candidatos a revisar"
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-medium text-slate-700">Por sistema</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {Object.entries(bySystem).map(([key, count]) => (
              <li key={key} className="flex justify-between">
                <span className="text-slate-600">
                  {SOURCE_SYSTEM_LABELS[key as SourceSystem]}
                </span>
                <span className="font-medium text-slate-900">{count}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-medium text-slate-700">Por tipo de trabajo</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {Object.entries(byWorkType).map(([key, count]) => (
              <li key={key} className="flex justify-between">
                <span className="text-slate-600">
                  {WORK_TYPE_LABELS[key as WorkType]}
                </span>
                <span className="font-medium text-slate-900">{count}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-medium text-slate-700">Por persona</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {Object.entries(byPerson).map(([id, count]) => (
              <li key={id} className="flex justify-between">
                <span className="text-slate-600">{personName(id)}</span>
                <span className="font-medium text-slate-900">{count}</span>
              </li>
            ))}
            {Object.keys(byPerson).length === 0 && (
              <li className="text-slate-400">Sin asignaciones todavía.</li>
            )}
          </ul>
        </div>
      </div>

      {rootCausesInScope.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-slate-700">
              Casos raíz con más recurrencia
            </h2>
            <Link
              to="/casos-raiz"
              className="text-xs font-medium text-slate-500 hover:text-slate-900"
            >
              Ver todos →
            </Link>
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {rootCausesInScope
              .slice()
              .sort((a, b) => b.count - a.count)
              .map(({ rc, count }) => (
                <li key={rc.id} className="flex justify-between gap-4">
                  <span className="text-slate-700">{rc.title}</span>
                  <span className="shrink-0 font-medium text-slate-900">{count} tickets</span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  )
}
