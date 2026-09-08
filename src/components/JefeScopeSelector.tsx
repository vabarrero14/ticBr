import type { Ticket } from '../lib/types'

export function JefeScopeSelector({
  tickets,
  value,
  onChange,
}: {
  tickets: Ticket[]
  value: string
  onChange: (value: string) => void
}) {
  const jefes = Array.from(
    new Set(tickets.map((t) => t.po?.jefeTic).filter((v): v is string => Boolean(v))),
  ).sort()

  return (
    <label className="flex items-center gap-2 text-xs font-medium text-slate-500">
      Alcance (Jefe TIC)
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900"
      >
        <option value="">Todo TIC</option>
        {jefes.map((j) => (
          <option key={j} value={j}>
            {j}
          </option>
        ))}
      </select>
    </label>
  )
}

/** true si el ticket entra dentro del alcance elegido (los que no tienen
 * po.jefeTic, ej tickets manuales de Redmine, nunca se ocultan por esto). */
export function inJefeScope(ticket: Ticket, jefeScope: string): boolean {
  if (!jefeScope) return true
  if (!ticket.po?.jefeTic) return true
  return ticket.po.jefeTic === jefeScope
}
