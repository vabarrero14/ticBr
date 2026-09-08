import { useMemo, useState } from 'react'
import { TicketFormModal } from '../components/TicketFormModal'
import { useCollectionData } from '../hooks/useCollectionData'
import { peopleCol, ticketsCol } from '../lib/firestore/collections'
import { currentMonth, formatMonth } from '../lib/month'
import { SOURCE_SYSTEM_LABELS, type Ticket } from '../lib/types'

const NO_MONTH = '__sin_mes__'

function BoardColumn({
  title,
  accent,
  tickets,
  personName,
  onEdit,
}: {
  title: string
  accent: string
  tickets: Ticket[]
  personName: (id: string) => string
  onEdit: (t: Ticket) => void
}) {
  return (
    <div className="flex-1 space-y-3">
      <h2 className={`text-sm font-semibold ${accent}`}>
        {title} <span className="text-slate-400">({tickets.length})</span>
      </h2>
      {tickets.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-400">
          Nada marcado para este mes.
        </p>
      )}
      {tickets.map((t) => (
        <button
          key={t.id}
          onClick={() => onEdit(t)}
          className="block w-full rounded-lg border border-slate-200 bg-white p-4 text-left hover:border-slate-300"
        >
          <p className="font-medium text-slate-900">{t.title}</p>
          <p className="mt-1 text-xs text-slate-500">
            {SOURCE_SYSTEM_LABELS[t.sourceSystem]} · {t.sourceId}
            {t.originSystem && ` · ${t.originSystem}`}
          </p>
          {t.description && (
            <p className="mt-2 text-sm text-slate-600 line-clamp-3">{t.description}</p>
          )}
          {t.assignees.length > 0 && (
            <p className="mt-2 text-xs text-slate-400">
              {t.assignees.map(personName).join(', ')}
            </p>
          )}
        </button>
      ))}
    </div>
  )
}

export function TableroPage() {
  const { data: tickets, loading } = useCollectionData(ticketsCol)
  const { data: people } = useCollectionData(peopleCol)
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null)

  const allBoardTickets = tickets.filter((t) => t.board)

  // Meses con algo marcado (más el mes actual, así siempre hay algo para
  // elegir aunque todavía no se haya cargado nada) + un bucket aparte para
  // lo marcado antes de que existiera el campo de mes.
  const months = useMemo(() => {
    const set = new Set(allBoardTickets.map((t) => t.boardMonth).filter((m): m is string => Boolean(m)))
    set.add(currentMonth())
    return Array.from(set).sort().reverse()
  }, [allBoardTickets])

  const hasUnassigned = allBoardTickets.some((t) => !t.boardMonth)

  const [month, setMonth] = useState(currentMonth())

  const personName = (id: string) => people.find((p) => p.id === id)?.name ?? id

  const boardTickets =
    month === NO_MONTH
      ? allBoardTickets.filter((t) => !t.boardMonth)
      : allBoardTickets.filter((t) => t.boardMonth === month)
  const destacar = boardTickets.filter((t) => t.boardCategory === 'destacar')
  const mejorar = boardTickets.filter((t) => t.boardCategory === 'mejorar')

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Tablero mensual</h1>
          <p className="text-sm text-slate-500">
            Temas marcados para la presentación mensual: aspectos a destacar y
            aspectos a mejorar. Marcá un ticket editándolo desde acá o desde{' '}
            <span className="font-medium">Tickets</span>.
          </p>
        </div>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-500">
          Mes
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900"
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {formatMonth(m)}
                {m === currentMonth() ? ' (actual)' : ''}
              </option>
            ))}
            {hasUnassigned && <option value={NO_MONTH}>Sin mes asignado</option>}
          </select>
        </label>
      </div>

      {!loading && allBoardTickets.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-400">
          Todavía no marcaste ningún ticket para el tablero. Editá un ticket y
          tildá "Marcar para el tablero mensual".
        </p>
      )}

      {allBoardTickets.length > 0 && (
        <div className="flex flex-col gap-6 sm:flex-row">
          <BoardColumn
            title="Aspectos a destacar"
            accent="text-emerald-700"
            tickets={destacar}
            personName={personName}
            onEdit={setEditingTicket}
          />
          <BoardColumn
            title="Aspectos a mejorar"
            accent="text-amber-700"
            tickets={mejorar}
            personName={personName}
            onEdit={setEditingTicket}
          />
        </div>
      )}

      {editingTicket && (
        <TicketFormModal
          ticket={editingTicket}
          people={people}
          onClose={() => setEditingTicket(null)}
        />
      )}
    </div>
  )
}
