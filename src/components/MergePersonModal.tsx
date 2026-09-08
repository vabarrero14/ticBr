import { useState } from 'react'
import { mergePeople } from '../lib/firestore/people'
import type { Person } from '../lib/types'
import { Modal } from './Modal'

export function MergePersonModal({
  source,
  people,
  onClose,
}: {
  source: Person
  people: Person[]
  onClose: () => void
}) {
  const options = people.filter((p) => p.id !== source.id)
  const [targetId, setTargetId] = useState(options[0]?.id ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    if (!targetId) return
    setSaving(true)
    setError(null)
    try {
      await mergePeople(source.id, targetId)
      onClose()
    } catch (err) {
      console.error(err)
      setError('No se pudo fusionar. Probá de nuevo.')
      setSaving(false)
    }
  }

  const targetName = options.find((p) => p.id === targetId)?.name

  return (
    <Modal title={`Fusionar "${source.name}"`} onClose={onClose}>
      <div className="space-y-3">
        <p className="text-sm text-slate-500">
          Todos los tickets y casos raíz asignados a <strong>{source.name}</strong> pasan
          a la persona que elijas abajo, y <strong>{source.name}</strong> se borra.
          No se puede deshacer.
        </p>

        <select
          className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
          value={targetId}
          onChange={(e) => setTargetId(e.target.value)}
        >
          {options.length === 0 && <option value="">No hay otra persona para fusionar</option>}
          {options.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

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
            onClick={handleConfirm}
            disabled={saving || !targetId}
            className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? 'Fusionando…' : `Fusionar en "${targetName ?? ''}"`}
          </button>
        </div>
      </div>
    </Modal>
  )
}
