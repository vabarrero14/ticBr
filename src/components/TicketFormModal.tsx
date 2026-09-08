import { useState } from 'react'
import { createTicket, updateTicket } from '../lib/firestore/tickets'
import {
  BOARD_CATEGORY_LABELS,
  PRIORITY_LABELS,
  SOURCE_SYSTEM_LABELS,
  TICKET_STATUS_LABELS,
  WORK_TYPE_PRESETS,
  type BoardCategory,
  type Person,
  type Priority,
  type SourceSystem,
  type Ticket,
  type TicketStatus,
} from '../lib/types'
import { Field, inputClass } from './formFields'
import { Modal } from './Modal'
import { PersonFormModal } from './PersonFormModal'
import { PoDetailsPanel } from './PoDetailsPanel'

/** Tipo sugerido según la plataforma, para no arrancar de un campo vacío
 * (el usuario lo puede pisar libremente después). */
function defaultWorkTypeFor(source: SourceSystem): string {
  switch (source) {
    case 'redmine':
      return 'Operativo'
    case 'century':
      return 'SAP'
    case 'innovacion':
      return 'Proyecto de Innovación'
    case 'clickup_po':
      return 'Proyecto PO'
  }
}

export function TicketFormModal({
  ticket,
  people,
  existingSystems = [],
  existingWorkTypes = [],
  existingAreas = [],
  existingOwners = [],
  onClose,
}: {
  ticket?: Ticket
  people: Person[]
  /** Valores de "Sistema" ya vistos en otros tickets, para autocompletar. */
  existingSystems?: string[]
  /** Valores de "Tipo" ya vistos en otros tickets, para autocompletar. */
  existingWorkTypes?: string[]
  /** Valores de "Área / gerencia" ya vistos, para autocompletar. */
  existingAreas?: string[]
  /** Valores de "Dueño" ya vistos, para autocompletar. */
  existingOwners?: string[]
  onClose: () => void
}) {
  const [sourceSystem, setSourceSystem] = useState<SourceSystem>(
    ticket?.sourceSystem ?? 'redmine',
  )
  const [sourceId, setSourceId] = useState(ticket?.sourceId ?? '')
  const [sourceUrl, setSourceUrl] = useState(ticket?.sourceUrl ?? '')
  const [title, setTitle] = useState(ticket?.title ?? '')
  const [description, setDescription] = useState(ticket?.description ?? '')
  const [workType, setWorkType] = useState(
    ticket?.workType ?? defaultWorkTypeFor(sourceSystem),
  )
  const [originSystem, setOriginSystem] = useState(ticket?.originSystem ?? '')
  const [status, setStatus] = useState<TicketStatus>(ticket?.status ?? 'abierto')
  const [priority, setPriority] = useState<Priority>(ticket?.priority ?? 'media')
  const [area, setArea] = useState(ticket?.area ?? '')
  const [businessOwner, setBusinessOwner] = useState(ticket?.businessOwner ?? '')
  const [tags, setTags] = useState(ticket?.tags.join(', ') ?? '')
  const [board, setBoard] = useState(ticket?.board ?? false)
  const [boardCategory, setBoardCategory] = useState<BoardCategory>(
    ticket?.boardCategory ?? 'destacar',
  )
  const [assignees, setAssignees] = useState<string[]>(ticket?.assignees ?? [])
  const [showPersonModal, setShowPersonModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const workTypeOptions = Array.from(new Set([...WORK_TYPE_PRESETS, ...existingWorkTypes]))

  function handleSourceSystemChange(value: SourceSystem) {
    setSourceSystem(value)
    // Solo autocompletamos el tipo al crear un ticket nuevo — si ya existe,
    // no le pisamos un tipo que el usuario haya elegido a propósito.
    if (!ticket) setWorkType(defaultWorkTypeFor(value))
  }

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
      workType: workType.trim() || defaultWorkTypeFor(sourceSystem),
      originSystem: originSystem.trim() || undefined,
      status,
      priority,
      assignees,
      area: area.trim() || undefined,
      businessOwner: businessOwner.trim() || undefined,
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      board,
      boardCategory: board ? boardCategory : undefined,
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
        {ticket?.po && <PoDetailsPanel po={ticket.po} log={ticket.log} />}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Plataforma de gestión">
              <select
                className={inputClass}
                value={sourceSystem}
                onChange={(e) => handleSourceSystemChange(e.target.value as SourceSystem)}
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

          <div className="grid grid-cols-2 gap-3">
            <Field label="Tipo">
              <input
                className={inputClass}
                list="work-type-options"
                value={workType}
                onChange={(e) => setWorkType(e.target.value)}
                placeholder="ej: Operativo, SAP, PO 2026…"
              />
              <datalist id="work-type-options">
                {workTypeOptions.map((wt) => (
                  <option key={wt} value={wt} />
                ))}
              </datalist>
            </Field>
            <Field label="Sistema (dónde ocurre el incidente)">
              <input
                className={inputClass}
                list="origin-system-options"
                value={originSystem}
                onChange={(e) => setOriginSystem(e.target.value)}
                placeholder="ej: SAP, B-POS, Infraestructura…"
              />
              <datalist id="origin-system-options">
                {existingSystems.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
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

          <div className="grid grid-cols-3 gap-3">
            <Field label="Área / gerencia">
              <input
                className={inputClass}
                list="area-options"
                value={area}
                onChange={(e) => setArea(e.target.value)}
              />
              <datalist id="area-options">
                {existingAreas.map((a) => (
                  <option key={a} value={a} />
                ))}
              </datalist>
            </Field>
            <Field label="Dueño (negocio)">
              <input
                className={inputClass}
                list="owner-options"
                value={businessOwner}
                onChange={(e) => setBusinessOwner(e.target.value)}
                placeholder="Responsable del lado del negocio"
              />
              <datalist id="owner-options">
                {existingOwners.map((o) => (
                  <option key={o} value={o} />
                ))}
              </datalist>
            </Field>
            <Field label="Tags (separados por coma)">
              <input
                className={inputClass}
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </Field>
          </div>

          <div className="rounded-md border border-slate-200 p-3">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={board}
                onChange={(e) => setBoard(e.target.checked)}
              />
              Marcar para el tablero mensual
            </label>
            {board && (
              <div className="mt-2 flex gap-4 pl-6 text-sm">
                {(Object.entries(BOARD_CATEGORY_LABELS) as [BoardCategory, string][]).map(
                  ([value, label]) => (
                    <label key={value} className="flex items-center gap-1.5 text-slate-600">
                      <input
                        type="radio"
                        name="boardCategory"
                        checked={boardCategory === value}
                        onChange={() => setBoardCategory(value)}
                      />
                      {label}
                    </label>
                  ),
                )}
              </div>
            )}
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
