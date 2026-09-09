import { useState } from 'react'
import type { PoDetails } from '../lib/types'

const FIELD_LABELS: Partial<Record<keyof PoDetails, string>> = {
  nroPedido: 'Nro Pedido',
  century: 'Century',
  redmineTic: 'Redmine TIC',
  clickup: 'ClickUp',
  tipoPoAdicional: 'Tipo PO/Adicional',
  direccion: 'Dirección',
  jefatura: 'Jefatura',
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
 * (planilla "Consolidado") para este ticket. El historial de seguimiento
 * se muestra aparte, en `TicketLogSection` (ver TicketFormModal).
 */
export function PoDetailsPanel({ po }: { po: PoDetails }) {
  const [open, setOpen] = useState(false)
  const entries = (Object.entries(po) as [keyof PoDetails, unknown][]).filter(
    ([, v]) => v !== undefined && v !== null && v !== '',
  )

  if (entries.length === 0) return null

  return (
    <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-medium text-slate-700"
      >
        <span>Datos importados de PO</span>
        <span className="text-slate-400">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-slate-200 px-3 py-3 text-xs">
          {entries.map(([key, value]) => (
            <div key={key}>
              <dt className="text-slate-400">{FIELD_LABELS[key] ?? key}</dt>
              <dd className="text-slate-700">{String(value)}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  )
}
