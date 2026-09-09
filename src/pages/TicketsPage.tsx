import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FilterSelect } from '../components/FilterSelect'
import { JefeScopeSelector, inJefeScope } from '../components/JefeScopeSelector'
import { LinkRootCauseModal } from '../components/LinkRootCauseModal'
import { MyTicketsToggle } from '../components/MyTicketsToggle'
import { Pagination } from '../components/Pagination'
import { TicketFormModal } from '../components/TicketFormModal'
import { useCollectionData } from '../hooks/useCollectionData'
import { useJefeScope } from '../hooks/useJefeScope'
import { distinctValues } from '../lib/distinctValues'
import { peopleCol, rootCausesCol, ticketsCol } from '../lib/firestore/collections'
import {
  BOARD_CATEGORY_LABELS,
  PRIORITY_LABELS,
  SOURCE_SYSTEM_LABELS,
  TICKET_STATUS_LABELS,
  type Ticket,
} from '../lib/types'

const statusBadge: Record<string, string> = {
  abierto: 'bg-blue-50 text-blue-700',
  en_progreso: 'bg-amber-50 text-amber-700',
  bloqueado: 'bg-red-50 text-red-700',
  resuelto: 'bg-emerald-50 text-emerald-700',
  cerrado: 'bg-slate-100 text-slate-500',
}

export function TicketsPage() {
  const { data: allTickets, loading } = useCollectionData(ticketsCol, 'createdAt')
  const { data: people } = useCollectionData(peopleCol)
  const { data: rootCauses } = useCollectionData(rootCausesCol)
  const [jefeScope, setJefeScope] = useJefeScope()
  const tickets = useMemo(
    () => allTickets.filter((t) => inJefeScope(t, jefeScope)),
    [allTickets, jefeScope],
  )

  const originSystems = useMemo(() => distinctValues(allTickets, (t) => t.originSystem), [allTickets])
  const workTypes = useMemo(() => distinctValues(allTickets, (t) => t.workType), [allTickets])
  const areas = useMemo(() => distinctValues(allTickets, (t) => t.area), [allTickets])
  const owners = useMemo(() => distinctValues(allTickets, (t) => t.businessOwner), [allTickets])

  // Los filtros pueden venir precargados por URL (ej: un click en una barra
  // del Dashboard te trae acá ya filtrado — "veo un número" pasa a "veo
  // cuáles son"). El efecto de abajo los relee cada vez que cambia la URL,
  // no solo al montar, por si ya estabas en /tickets y volvés a clickear
  // otra barra distinta.
  const [searchParams] = useSearchParams()
  const [sourceSystem, setSourceSystem] = useState('')
  const [originSystem, setOriginSystem] = useState('')
  const [workType, setWorkType] = useState('')
  const [status, setStatus] = useState('')
  const [assignee, setAssignee] = useState('')
  const [area, setArea] = useState('')
  const [owner, setOwner] = useState('')
  const [board, setBoard] = useState('')
  const [search, setSearch] = useState('')

  useEffect(() => {
    setSourceSystem(searchParams.get('sourceSystem') ?? '')
    setOriginSystem(searchParams.get('originSystem') ?? '')
    setWorkType(searchParams.get('workType') ?? '')
    setStatus(searchParams.get('status') ?? '')
    setAssignee(searchParams.get('assignee') ?? '')
    setArea(searchParams.get('area') ?? '')
    setOwner(searchParams.get('owner') ?? '')
  }, [searchParams])

  const [showNewTicket, setShowNewTicket] = useState(false)
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null)
  const [linkingTicket, setLinkingTicket] = useState<Ticket | null>(null)

  const personName = (id: string) => people.find((p) => p.id === id)?.name ?? id

  const rootCauseTitle = (id: string | null) =>
    id ? rootCauses.find((rc) => rc.id === id)?.title : null

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      if (sourceSystem && t.sourceSystem !== sourceSystem) return false
      if (originSystem && t.originSystem !== originSystem) return false
      if (workType && t.workType !== workType) return false
      if (status && t.status !== status) return false
      if (assignee && !t.assignees.includes(assignee)) return false
      if (area && t.area !== area) return false
      if (owner && t.businessOwner !== owner) return false
      if (board === 'marcados' && !t.board) return false
      if ((board === 'destacar' || board === 'mejorar') && t.boardCategory !== board) return false
      if (
        search &&
        !`${t.title} ${t.sourceId}`.toLowerCase().includes(search.toLowerCase())
      )
        return false
      return true
    })
  }, [tickets, sourceSystem, originSystem, workType, status, assignee, area, owner, board, search])

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  // Volver a la página 1 cada vez que cambian los filtros o el alcance — si
  // no, es fácil quedar "varado" en una página que ya no tiene resultados.
  useEffect(() => {
    setPage(1)
  }, [sourceSystem, originSystem, workType, status, assignee, area, owner, board, search, jefeScope])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Tickets</h1>
          <p className="text-sm text-slate-500">
            Vista unificada de Redmine, Century, ClickUp/Excel PO e Innovación.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <JefeScopeSelector tickets={allTickets} value={jefeScope} onChange={setJefeScope} />
          <button
            onClick={() => setShowNewTicket(true)}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
          >
            + Nuevo ticket
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          Buscar
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Título o Nº de ticket"
            className="w-56 rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          />
        </label>

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
        <FilterSelect
          label="Tablero"
          value={board}
          onChange={setBoard}
          options={[
            { value: 'marcados', label: 'Marcados (todos)' },
            ...Object.entries(BOARD_CATEGORY_LABELS).map(([value, label]) => ({ value, label })),
          ]}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Ticket</th>
              <th className="px-4 py-2 font-medium">Plataforma</th>
              <th className="px-4 py-2 font-medium">Sistema</th>
              <th className="px-4 py-2 font-medium">Tipo</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              <th className="px-4 py-2 font-medium">Prioridad</th>
              <th className="px-4 py-2 font-medium">Asignado</th>
              <th className="px-4 py-2 font-medium">Caso raíz</th>
              <th className="px-4 py-2 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginated.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    {t.board && (
                      <span
                        title={t.boardCategory === 'mejorar' ? 'Tablero: a mejorar' : 'Tablero: a destacar'}
                        className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                          t.boardCategory === 'mejorar' ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                      />
                    )}
                    <div className="font-medium text-slate-900">{t.title}</div>
                  </div>
                  <div className="text-xs text-slate-400">{t.sourceId}</div>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {SOURCE_SYSTEM_LABELS[t.sourceSystem]}
                </td>
                <td className="px-4 py-3 text-slate-600">{t.originSystem ?? '—'}</td>
                <td className="px-4 py-3 text-slate-600">{t.workType}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge[t.status]}`}
                  >
                    {TICKET_STATUS_LABELS[t.status]}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {PRIORITY_LABELS[t.priority]}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {t.assignees.map(personName).join(', ') || '—'}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => setLinkingTicket(t)}
                    className="text-left"
                  >
                    {rootCauseTitle(t.rootCauseId) ? (
                      <span className="text-slate-700 hover:underline">
                        {rootCauseTitle(t.rootCauseId)}
                      </span>
                    ) : (
                      <span className="text-xs text-amber-600 hover:underline">
                        Sin vincular
                      </span>
                    )}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => setEditingTicket(t)}
                    className="text-xs font-medium text-slate-500 hover:text-slate-900"
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                  {allTickets.length === 0
                    ? 'Todavía no hay tickets cargados. Creá el primero.'
                    : tickets.length === 0
                      ? 'No hay tickets en este alcance (Jefe TIC). Probá "Todo TIC".'
                      : 'No hay tickets que coincidan con los filtros.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination
          page={currentPage}
          pageSize={pageSize}
          totalItems={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
        />
      </div>

      {showNewTicket && (
        <TicketFormModal
          people={people}
          existingSystems={originSystems}
          existingWorkTypes={workTypes}
          existingAreas={areas}
          existingOwners={owners}
          onClose={() => setShowNewTicket(false)}
        />
      )}
      {editingTicket && (
        <TicketFormModal
          ticket={editingTicket}
          people={people}
          existingSystems={originSystems}
          existingWorkTypes={workTypes}
          existingAreas={areas}
          existingOwners={owners}
          onClose={() => setEditingTicket(null)}
        />
      )}
      {linkingTicket && (
        <LinkRootCauseModal
          ticket={linkingTicket}
          rootCauses={rootCauses}
          people={people}
          onClose={() => setLinkingTicket(null)}
        />
      )}
    </div>
  )
}
