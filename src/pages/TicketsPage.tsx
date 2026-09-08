import { useMemo, useState } from 'react'
import { FilterSelect } from '../components/FilterSelect'
import { mockPeople, mockRootCauses, mockTickets } from '../lib/mockData'
import {
  PRIORITY_LABELS,
  SOURCE_SYSTEM_LABELS,
  TICKET_STATUS_LABELS,
  WORK_TYPE_LABELS,
} from '../lib/types'

const statusBadge: Record<string, string> = {
  abierto: 'bg-blue-50 text-blue-700',
  en_progreso: 'bg-amber-50 text-amber-700',
  bloqueado: 'bg-red-50 text-red-700',
  resuelto: 'bg-emerald-50 text-emerald-700',
  cerrado: 'bg-slate-100 text-slate-500',
}

export function TicketsPage() {
  const [sourceSystem, setSourceSystem] = useState('')
  const [workType, setWorkType] = useState('')
  const [status, setStatus] = useState('')
  const [assignee, setAssignee] = useState('')
  const [search, setSearch] = useState('')

  const personName = (id: string) =>
    mockPeople.find((p) => p.id === id)?.name ?? id

  const rootCauseTitle = (id: string | null) =>
    id ? mockRootCauses.find((rc) => rc.id === id)?.title : null

  const filtered = useMemo(() => {
    return mockTickets.filter((t) => {
      if (sourceSystem && t.sourceSystem !== sourceSystem) return false
      if (workType && t.workType !== workType) return false
      if (status && t.status !== status) return false
      if (assignee && !t.assignees.includes(assignee)) return false
      if (
        search &&
        !`${t.title} ${t.sourceId}`.toLowerCase().includes(search.toLowerCase())
      )
        return false
      return true
    })
  }, [sourceSystem, workType, status, assignee, search])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Tickets</h1>
        <p className="text-sm text-slate-500">
          Vista unificada de Redmine, Century, ClickUp/Excel PO e Innovación.
        </p>
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

        <FilterSelect
          label="Sistema"
          value={sourceSystem}
          onChange={setSourceSystem}
          options={Object.entries(SOURCE_SYSTEM_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
        />
        <FilterSelect
          label="Tipo de trabajo"
          value={workType}
          onChange={setWorkType}
          options={Object.entries(WORK_TYPE_LABELS).map(([value, label]) => ({
            value,
            label,
          }))}
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
          options={mockPeople.map((p) => ({ value: p.id, label: p.name }))}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">Ticket</th>
              <th className="px-4 py-2 font-medium">Sistema</th>
              <th className="px-4 py-2 font-medium">Tipo</th>
              <th className="px-4 py-2 font-medium">Estado</th>
              <th className="px-4 py-2 font-medium">Prioridad</th>
              <th className="px-4 py-2 font-medium">Asignado</th>
              <th className="px-4 py-2 font-medium">Caso raíz</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((t) => (
              <tr key={t.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{t.title}</div>
                  <div className="text-xs text-slate-400">{t.sourceId}</div>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {SOURCE_SYSTEM_LABELS[t.sourceSystem]}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {WORK_TYPE_LABELS[t.workType]}
                </td>
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
                  {t.assignees.map(personName).join(', ')}
                </td>
                <td className="px-4 py-3">
                  {rootCauseTitle(t.rootCauseId) ? (
                    <span className="text-slate-700">
                      {rootCauseTitle(t.rootCauseId)}
                    </span>
                  ) : (
                    <span className="text-xs text-amber-600">Sin vincular</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                  No hay tickets que coincidan con los filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
