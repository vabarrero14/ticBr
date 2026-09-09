import { useState } from 'react'
import { addTicketLogEntry } from '../lib/firestore/tickets'
import type { TicketLogEntry } from '../lib/types'

function formatNow(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(now.getDate())}/${pad(now.getMonth() + 1)}/${now.getFullYear()} ${pad(
    now.getHours(),
  )}:${pad(now.getMinutes())}`
}

/**
 * Historial de seguimiento de un ticket: lista lo ya cargado (por el
 * importador de PO o a mano) y permite sumar nuevos comentarios/avances
 * para CUALQUIER ticket, no solo los que vienen de la planilla PO.
 *
 * Mantiene estado local optimista porque el `ticket` que recibe
 * TicketFormModal es una foto tomada al abrir el modal — no se actualiza
 * solo con el listener de Firestore del padre.
 */
export function TicketLogSection({
  ticketId,
  log,
  author,
}: {
  ticketId: string
  log?: TicketLogEntry[]
  author: string
}) {
  const [entries, setEntries] = useState<TicketLogEntry[]>(log ?? [])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd() {
    if (!note.trim()) return
    setSaving(true)
    setError(null)
    const entry: TicketLogEntry = { date: formatNow(), note: note.trim(), author }
    try {
      await addTicketLogEntry(ticketId, entry)
      setEntries((prev) => [entry, ...prev])
      setNote('')
    } catch (err) {
      console.error(err)
      setError('No se pudo guardar el comentario.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-sm font-medium text-slate-700">
        Historial de seguimiento {entries.length > 0 && `· ${entries.length}`}
      </p>

      <div className="mt-2 flex gap-2">
        <textarea
          className="flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-900"
          rows={2}
          placeholder="Agregar un avance o comentario…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={saving || !note.trim()}
          className="shrink-0 self-start rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {saving ? 'Guardando…' : 'Agregar'}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      {entries.length > 0 && (
        <ul className="mt-3 max-h-48 space-y-1.5 overflow-y-auto text-xs">
          {entries.map((entry, i) => (
            <li key={i} className="border-b border-slate-100 pb-1.5">
              <span className="font-medium text-slate-600">
                {entry.date}
                {entry.author ? ` · ${entry.author}` : ''}:{' '}
              </span>
              <span className="text-slate-600">{entry.note}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
