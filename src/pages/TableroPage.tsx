import { useState } from 'react'
import { TicketFormModal } from '../components/TicketFormModal'
import { useCollectionData } from '../hooks/useCollectionData'
import { peopleCol, ticketsCol } from '../lib/firestore/collections'
import { SOURCE_SYSTEM_LABELS, type Ticket } from '../lib/types'

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
          Nada marcado todavía.
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

  const personName = (id: string) => people.find((p) => p.id === id)?.name ?? id

  const boardTickets = tickets.filter((t) => t.board)
  const destacar = boardTickets.filter((t) => t.boardCategory === 'destacar')
  const mejorar = boardTickets.filter((t) => t.boardCategory === 'mejorar')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Tablero mensual</h1>
        <p className="text-sm text-slate-500">
          Temas marcados para la presentación mensual: aspectos a destacar y
          aspectos a mejorar. Marcá un ticket editándolo desde acá o desde{' '}
          <span className="font-medium">Tickets</span>.
        </p>
      </div>

      {!loading && boardTickets.length === 0 && (
        <p className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-400">
          Todavía no marcaste ningún ticket para el tablero. Editá un ticket y
          tildá "Marcar para el tablero mensual".
        </p>
      )}

      {boardTickets.length > 0 && (
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
