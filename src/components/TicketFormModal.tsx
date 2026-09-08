import { useState } from 'react'
import { createTicket, updateTicket } from '../lib/firestore/tickets'
import {
  PRIORITY_LABELS,
  SOURCE_SYSTEM_LABELS,
  TICKET_STATUS_LABELS,
  WORK_TYPE_LABELS,
  type Person,
  type Priority,
  type SourceSystem,
  type Ticket,
  type TicketStatus,
  type WorkType,
} from '../lib/types'
import { Field, inputClass } from './formFields'
import { Modal } from './Modal'
import { PersonFormModal } from './PersonFormModal'

export function TicketFormModal({
  ticket,
  people,
  onClose,
}: {
  ticket?: Ticket
  people: Person[]
  onClose: () => void
}) {
  const [sourceSystem, setSourceSystem] = useState<SourceSystem>(
    ticket?.sourceSystem ?? 'redmine',
  )
  const [sourceId, setSourceId] = useState(ticket?.sourceId ?? '')
  const [sourceUrl, setSourceUrl] = useState(ticket?.sourceUrl ?? '')
  const [title, setTitle] = useState(ticket?.title ?? '')
  const [description, setDescription] = useState(ticket?.description ?? '')
  const [workType, setWorkType] = useState<WorkType>(ticket?.workType ?? 'operativo')
  const [status, setStatus] = useState<TicketStatus>(ticket?.status ?? 'abierto')
  const [priority, setPriority] = useState<Priority>(ticket?.priority ?? 'media')
  const [area, setArea] = useState(ticket?.area ?? '')
  const [tags, setTags] = useState(ticket?.tags.join(', ') ?? '')
  const [assignees, setAssignees] = useState<string[]>(ticket?.assignees ?? [])
  const [showPersonModal, setShowPersonModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toggleAssignee(id: string) {
    setAssignees((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !sourceId.trim()) {
      setError('Título y Nº de ticket son obligatorios.')
      return
    }
    setSaving(true)
    setError(null)

    const payload = {
      sourceSystem,
      sourceId: sourceId.trim(),
      sourceUrl: sourceUrl.trim() || undefined,
      title: title.trim(),
      description: description.trim(),
      workType,
      status,
      priority,
      assignees,
      area: area.trim() || undefined,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    }

    try {
      if (ticket) {
        await updateTicket(ticket.id, payload)
      } else {
        await createTicket({ ...payload, rootCauseId: null })
      }
      onClose()
    } catch (err) {
      console.error(err)
      setError('No se pudo guardar el ticket.')
      setSaving(false)
    }
  }

  return (
    <>
      <Modal title={ticket ? 'Editar ticket' : 'Nuevo ticket'} onClose={onClose}>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sistema de origen">
              <select
                className={inputClass}
                value={sourceSystem}
                onChange={(e) => setSourceSystem(e.target.value as SourceSystem)}
              >
                {Object.entries(SOURCE_SYSTEM_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nº de ticket / id origen">
              <input
                className={inputClass}
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                placeholder="ej: RM-4821"
              />
            </Field>
          </div>

          <Field label="Link al ticket original (opcional)">
            <input
              className={inputClass}
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="https://…"
            />
          </Field>

          <Field label="Título">
            <input
              className={inputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus={!ticket}
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

          <div className="grid grid-cols-3 gap-3">
            <Field label="Tipo de trabajo">
              <select
                className={inputClass}
                value={workType}
                onChange={(e) => setWorkType(e.target.value as WorkType)}
              >
                {Object.entries(WORK_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Estado">
              <select
                className={inputClass}
                value={status}
                onChange={(e) => setStatus(e.target.value as TicketStatus)}
              >
                {Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Prioridad">
              <select
                className={inputClass}
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
              >
                {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Área / gerencia">
              <input
                className={inputClass}
                value={area}
                onChange={(e) => setArea(e.target.value)}
              />
            </Field>
            <Field label="Tags (separados por coma)">
              <input
                className={inputClass}
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </Field>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Asignados</span>
              <button
                type="button"
                onClick={() => setShowPersonModal(true)}
                className="text-xs font-medium text-slate-500 hover:text-slate-900"
              >
                + Nueva persona
              </button>
            </div>
            <div className="mt-1 flex flex-wrap gap-2 rounded-md border border-slate-200 p-2">
              {people.length === 0 && (
                <span className="text-xs text-slate-400">
                  Todavía no hay personas cargadas.
                </span>
              )}
              {people.map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-1.5 rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-600"
                >
                  <input
                    type="checkbox"
                    checked={assignees.includes(p.id)}
                    onChange={() => toggleAssignee(p.id)}
                  />
                  {p.name}
                </label>
              ))}
            </div>
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
              {saving ? 'Guardando…' : ticket ? 'Guardar cambios' : 'Crear ticket'}
            </button>
          </div>
        </form>
      </Modal>

      {showPersonModal && (
        <PersonFormModal
          onClose={() => setShowPersonModal(false)}
          onCreated={(id) => {
            setAssignees((prev) => [...prev, id])
            setShowPersonModal(false)
          }}
        />
      )}
    </>
  )
}
