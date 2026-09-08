import { useState } from 'react'
import { createRootCause, updateRootCause } from '../lib/firestore/rootCauses'
import {
  ROOT_CAUSE_STATUS_LABELS,
  type Person,
  type RootCause,
  type RootCauseStatus,
} from '../lib/types'
import { Field, inputClass } from './formFields'
import { Modal } from './Modal'

export function RootCauseFormModal({
  rootCause,
  people,
  onClose,
  onCreated,
}: {
  rootCause?: RootCause
  people: Person[]
  onClose: () => void
  /** Si se pasa, se llama con el id del nuevo caso raíz en vez de onClose(). */
  onCreated?: (id: string) => void
}) {
  const [title, setTitle] = useState(rootCause?.title ?? '')
  const [description, setDescription] = useState(rootCause?.description ?? '')
  const [analysis, setAnalysis] = useState(rootCause?.analysis ?? '')
  const [solution, setSolution] = useState(rootCause?.solution ?? '')
  const [status, setStatus] = useState<RootCauseStatus>(
    rootCause?.status ?? 'identificado',
  )
  const [owner, setOwner] = useState(rootCause?.owner ?? people[0]?.id ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !owner) {
      setError('Título y responsable son obligatorios.')
      return
    }
    setSaving(true)
    setError(null)

    const payload = {
      title: title.trim(),
      description: description.trim(),
      analysis: analysis.trim() || undefined,
      solution: solution.trim() || undefined,
      status,
      owner,
    }

    try {
      if (rootCause) {
        await updateRootCause(rootCause.id, {
          ...payload,
          resolvedAt: status === 'resuelto' ? new Date().toISOString() : null,
        })
      } else {
        const id = await createRootCause(payload)
        if (onCreated) {
          onCreated(id)
          return
        }
      }
      onClose()
    } catch (err) {
      console.error(err)
      setError('No se pudo guardar el caso raíz.')
      setSaving(false)
    }
  }

  return (
    <Modal title={rootCause ? 'Editar caso raíz' : 'Nuevo caso raíz'} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label="Título del problema de fondo">
          <input
            className={inputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </Field>

        <Field label="Descripción">
          <textarea
            className={inputClass}
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </Field>

        <Field label="Análisis (5 whys, Ishikawa, etc. — opcional)">
          <textarea
            className={inputClass}
            rows={2}
            value={analysis}
            onChange={(e) => setAnalysis(e.target.value)}
          />
        </Field>

        <Field label="Solución definitiva (opcional)">
          <textarea
            className={inputClass}
            rows={2}
            value={solution}
            onChange={(e) => setSolution(e.target.value)}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Estado">
            <select
              className={inputClass}
              value={status}
              onChange={(e) => setStatus(e.target.value as RootCauseStatus)}
            >
              {Object.entries(ROOT_CAUSE_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Responsable">
            <select
              className={inputClass}
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
            >
              <option value="">Seleccionar…</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

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
            type="submit"
            disabled={saving}
            className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {saving ? 'Guardando…' : rootCause ? 'Guardar cambios' : 'Crear caso raíz'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
