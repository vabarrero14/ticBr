import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart } from '../components/BarChart'
import { FilterSelect } from '../components/FilterSelect'
import { JefeScopeSelector, inJefeScope } from '../components/JefeScopeSelector'
import { MyTicketsToggle } from '../components/MyTicketsToggle'
import { StatCard } from '../components/StatCard'
import { useCollectionData } from '../hooks/useCollectionData'
import { useJefeScope } from '../hooks/useJefeScope'
import { distinctValues } from '../lib/distinctValues'
import { peopleCol, rootCausesCol, ticketsCol } from '../lib/firestore/collections'
import { currentMonth } from '../lib/month'
import { SOURCE_SYSTEM_LABELS, TICKET_STATUS_LABELS } from '../lib/types'

function countBy<T extends string>(items: T[]): Record<string, number> {
  return items.reduce<Record<string, number>>((acc, key) => {
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})
}

function toBars(counts: Record<string, number>, labelOf: (key: string) => string = (k) => k) {
  return Object.entries(counts).map(([key, value]) => ({ label: labelOf(key), value, key }))
}

export function DashboardPage() {
  const { data: allTickets, loading } = useCollectionData(ticketsCol)
  const { data: people } = useCollectionData(peopleCol)
  const { data: rootCauses } = useCollectionData(rootCausesCol)
  const [jefeScope, setJefeScope] = useJefeScope()

  const [sourceSystem, setSourceSystem] = useState('')
  const [originSystem, setOriginSystem] = useState('')
  const [workType, setWorkType] = useState('')
  const [status, setStatus] = useState('')
  const [assignee, setAssignee] = useState('')
  const [area, setArea] = useState('')
  const [owner, setOwner] = useState('')

  const originSystems = useMemo(() => distinctValues(allTickets, (t) => t.originSystem), [allTickets])
  const workTypes = useMemo(() => distinctValues(allTickets, (t) => t.workType), [allTickets])
  const areas = useMemo(() => distinctValues(allTickets, (t) => t.area), [allTickets])
  const owners = useMemo(() => distinctValues(allTickets, (t) => t.businessOwner), [allTickets])

  const tickets = useMemo(() => {
    return allTickets.filter((t) => {
      if (!inJefeScope(t, jefeScope)) return false
      if (sourceSystem && t.sourceSystem !== sourceSystem) return false
      if (originSystem && t.originSystem !== originSystem) return false
      if (workType && t.workType !== workType) return false
      if (status && t.status !== status) return false
      if (assignee && !t.assignees.includes(assignee)) return false
      if (area && t.area !== area) return false
      if (owner && t.businessOwner !== owner) return false
      return true
    })
  }, [allTickets, jefeScope, sourceSystem, originSystem, workType, status, assignee, area, owner])

  const openTickets = tickets.filter(
    (t) => t.status !== 'resuelto' && t.status !== 'cerrado',
  )
  const withoutRootCause = openTickets.filter((t) => t.rootCauseId === null)
  const boardCount = tickets.filter((t) => t.board && t.boardMonth === currentMonth()).length

  const byPlatform = countBy(tickets.map((t) => t.sourceSystem))
  const bySystem = countBy(tickets.map((t) => t.originSystem).filter((s): s is string => Boolean(s)))
  const byWorkType = countBy(tickets.map((t) => t.workType))
  const byPerson = countBy(tickets.flatMap((t) => t.assignees))
  const byArea = countBy(tickets.map((t) => t.area).filter((a): a is string => Boolean(a)))

  const personName = (id: string) => people.find((p) => p.id === id)?.name ?? id

  /** URL a /tickets con los filtros actuales del Dashboard, pisando (o
   * agregando) la dimensión que se acaba de clickear — así una barra o el
   * total de tickets llevan directo a la lista real, no solo al número. */
  function ticketsUrl(
    override: Partial<{
      sourceSystem: string
      originSystem: string
      workType: string
      status: string
      assignee: string
      area: string
      owner: string
    }> = {},
  ) {
    const merged = { sourceSystem, originSystem, workType, status, assignee, area, owner, ...override }
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(merged)) if (value) params.set(key, value)
    const qs = params.toString()
    return qs ? `/tickets?${qs}` : '/tickets'
  }

  // Recontar recurrencia de casos raíz sobre los tickets ya filtrados por
  // alcance/filtros, para no mezclar el conteo global guardado
  // (linkedTicketsCount) con una vista que puede estar mostrando un subconjunto.
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

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <MyTicketsToggle people={people} assignee={assignee} onChange={setAssignee} />
        <FilterSelect
          label="Plataforma"
          value={sourceSystem}
          onChange={setSourceSystem}
          options={Object.entries(SOURCE_SYSTEM_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <FilterSelect
          label="Sistema"
          value={originSystem}
          onChange={setOriginSystem}
          options={originSystems.map((s) => ({ value: s, label: s }))}
        />
        <FilterSelect
          label="Tipo"
          value={workType}
          onChange={setWorkType}
          options={workTypes.map((wt) => ({ value: wt, label: wt }))}
        />
        <FilterSelect
          label="Estado"
          value={status}
          onChange={setStatus}
          options={Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <FilterSelect
          label="Asignado"
          value={assignee}
          onChange={setAssignee}
          options={people.map((p) => ({ value: p.id, label: p.name }))}
        />
        <FilterSelect
          label="Gerencia"
          value={area}
          onChange={setArea}
          options={areas.map((a) => ({ value: a, label: a }))}
        />
        <FilterSelect
          label="Dueño"
          value={owner}
          onChange={setOwner}
          options={owners.map((o) => ({ value: o, label: o }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Link to={ticketsUrl()} className="block">
          <StatCard label="Tickets totales" value={tickets.length} hint="ver lista →" />
        </Link>
        <StatCard label="Abiertos" value={openTickets.length} />
        <StatCard label="Casos raíz activos" value={rootCausesInScope.length} />
        <StatCard
          label="Sin caso raíz vinculado"
          value={withoutRootCause.length}
          hint="candidatos a revisar"
        />
        <Link to="/tablero" className="block">
          <StatCard label="Temas tablero este mes" value={boardCount} hint="ver tablero →" />
        </Link>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-medium text-slate-700">Por plataforma</h2>
          <div className="mt-3">
            <BarChart
              data={toBars(byPlatform, (k) => SOURCE_SYSTEM_LABELS[k as keyof typeof SOURCE_SYSTEM_LABELS])}
              hrefFor={(key) => ticketsUrl({ sourceSystem: key })}
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-medium text-slate-700">Por sistema</h2>
          <div className="mt-3">
            <BarChart data={toBars(bySystem)} hrefFor={(key) => ticketsUrl({ originSystem: key })} />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-medium text-slate-700">Por tipo</h2>
          <div className="mt-3">
            <BarChart data={toBars(byWorkType)} hrefFor={(key) => ticketsUrl({ workType: key })} />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-medium text-slate-700">Por persona</h2>
          <div className="mt-3">
            <BarChart
              data={toBars(byPerson, personName)}
              hrefFor={(key) => ticketsUrl({ assignee: key })}
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4 sm:col-span-2">
          <h2 className="text-sm font-medium text-slate-700">Por gerencia</h2>
          <div className="mt-3">
            <BarChart data={toBars(byArea)} hrefFor={(key) => ticketsUrl({ area: key })} />
          </div>
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
