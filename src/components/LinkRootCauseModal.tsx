import { useState } from 'react'
import {
  linkTicketToRootCause,
  unlinkTicketFromRootCause,
} from '../lib/firestore/tickets'
import type { Person, RootCause, Ticket } from '../lib/types'
import { Modal } from './Modal'
import { RootCauseFormModal } from './RootCauseFormModal'

export function LinkRootCauseModal({
  ticket,
  rootCauses,
  people,
  onClose,
}: {
  ticket: Ticket
  rootCauses: RootCause[]
  people: Person[]
  onClose: () => void
}) {
  const [selected, setSelected] = useState(ticket.rootCauseId ?? '')
  const [showNewRootCause, setShowNewRootCause] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      if (!selected) {
        if (ticket.rootCauseId) {
          await unlinkTicketFromRootCause(ticket.id, ticket.rootCauseId)
        }
      } else {
        await linkTicketToRootCause(ticket.id, ticket.rootCauseId, selected)
      }
      onClose()
    } catch (err) {
      console.error(err)
      setError('No se pudo actualizar el vínculo.')
      setSaving(false)
    }
  }

  return (
    <>
      <Modal title={`Vincular "${ticket.title}" a un caso raíz`} onClose={onClose}>
        <div className="space-y-3">
          <p className="text-sm text-slate-500">
            Si este ticket es síntoma de un problema ya identificado, vinculalo al
            caso raíz correspondiente en vez de tratarlo como un caso aislado.
          </p>

          <select
            className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">Sin caso raíz</option>
            {rootCauses.map((rc) => (
              <option key={rc.id} value={rc.id}>
                {rc.title} ({rc.linkedTicketsCount} tickets)
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setShowNewRootCause(true)}
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            + Crear caso raíz nuevo
          </button>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      </Modal>

      {showNewRootCause && (
        <RootCauseFormModal
          people={people}
          onClose={() => setShowNewRootCause(false)}
          onCreated={(id) => {
            setSelected(id)
            setShowNewRootCause(false)
          }}
        />
      )}
    </>
  )
}
