import { useState } from 'react'
import { createPerson } from '../lib/firestore/people'
import { Field, inputClass } from './formFields'
import { Modal } from './Modal'

export function PersonFormModal({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (personId: string) => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [area, setArea] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('El nombre es obligatorio.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const id = await createPerson({
        name: name.trim(),
        email: email.trim(),
        area: area.trim() || undefined,
        active: true,
      })
      onCreated(id)
    } catch (err) {
      console.error(err)
      setError('No se pudo crear la persona.')
      setSaving(false)
    }
  }

  return (
    <Modal title="Nueva persona" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label="Nombre">
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </Field>
        <Field label="Email">
          <input
            className={inputClass}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Área / gerencia">
          <input
            className={inputClass}
            value={area}
            onChange={(e) => setArea(e.target.value)}
          />
        </Field>

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
            {saving ? 'Guardando…' : 'Crear'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
