import { useState } from 'react'
import type { PoDetails, TicketLogEntry } from '../lib/types'

const FIELD_LABELS: Partial<Record<keyof PoDetails, string>> = {
  nroPedido: 'Nro Pedido',
  century: 'Century',
  redmineTic: 'Redmine TIC',
  clickup: 'ClickUp',
  tipoPoAdicional: 'Tipo PO/Adicional',
  direccion: 'Dirección',
  jefatura: 'Jefatura',
  dueno: 'Dueño (negocio)',
  jefeTic: 'Jefe TIC',
  solicitudFirmada: 'Solicitud de requerimiento firmado',
  dfAlcance: 'DF/Alcance',
  actaPrueba: 'Acta de Prueba',
  actaCierre: 'Acta de Cierre',
  estimacionHoras: 'Estimación (horas)',
  mesEjecucion: 'Mes de ejecución',
  trimestre: 'Trimestre',
  tipoProveedor: 'Tipo Proveedor',
  responsableProveedor: 'Responsable Proveedor',
  pilar: 'Pilar',
  proyecto: 'Proyecto',
  meta: 'Meta',
  proveedor: 'Proveedor',
  solProyecto: 'Sol. Proyecto',
  fechaLimite: 'Fecha Límite',
  observaciones: 'Observaciones',
}

/**
 * Bloque de solo lectura con los datos que trajo el importador de PO
 * (planilla "Consolidado") para este ticket: campos propios de la
 * planificación PO y el historial de seguimiento fechado.
 */
export function PoDetailsPanel({
  po,
  log,
}: {
  po: PoDetails
  log?: TicketLogEntry[]
}) {
  const [open, setOpen] = useState(false)
  const entries = (Object.entries(po) as [keyof PoDetails, unknown][]).filter(
    ([, v]) => v !== undefined && v !== null && v !== '',
  )

  if (entries.length === 0 && (!log || log.length === 0)) return null

  return (
    <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-slate-700"
      >
        <span>Datos importados de PO {log && log.length > 0 && `· ${log.length} eventos de seguimiento`}</span>
        <span className="text-slate-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-slate-200 px-3 py-3">
          {entries.length > 0 && (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
              {entries.map(([key, value]) => (
                <div key={key}>
                  <dt className="text-slate-400">{FIELD_LABELS[key] ?? key}</dt>
                  <dd className="text-slate-700">{String(value)}</dd>
                </div>
              ))}
            </dl>
          )}

          {log && log.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500">Historial de seguimiento</p>
              <ul className="mt-1 max-h-48 space-y-1 overflow-y-auto text-xs">
                {log.map((entry, i) => (
                  <li key={i} className="border-b border-slate-100 pb-1">
                    <span className="font-medium text-slate-600">{entry.date}: </span>
                    <span className="text-slate-600">{entry.note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
