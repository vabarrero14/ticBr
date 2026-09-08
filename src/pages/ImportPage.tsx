import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { importPoRows, resetPoImport, type ImportPoResult } from '../lib/firestore/importPo'
import {
  parseConsolidadoWorkbook,
  type ParseResult,
} from '../lib/poImport/parseConsolidado'
import { PRIORITY_LABELS, TICKET_STATUS_LABELS } from '../lib/types'

export function ImportPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [fileName, setFileName] = useState<string | null>(null)
  const [parsed, setParsed] = useState<ParseResult | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportPoResult | null>(null)
  const [resetting, setResetting] = useState(false)
  const [resetMessage, setResetMessage] = useState<string | null>(null)

  async function handleFile(file: File) {
    setFileName(file.name)
    setParsed(null)
    setParseError(null)
    setResult(null)
    try {
      const buffer = await file.arrayBuffer()
      const parseResult = parseConsolidadoWorkbook(buffer)
      if (parseResult.rows.length === 0) {
        setParseError(
          'Se encontró la hoja pero no se detectó ninguna fila de datos. Revisá que el archivo tenga puntos cargados.',
        )
        return
      }
      setParsed(parseResult)
    } catch (err) {
      console.error(err)
      setParseError(err instanceof Error ? err.message : 'No se pudo leer el archivo.')
    }
  }

  async function handleConfirm() {
    if (!parsed || !user?.email) return
    setImporting(true)
    try {
      const res = await importPoRows(parsed.rows, {
        fileName: fileName ?? 'planilla.xlsx',
        sheetName: parsed.sheetName,
        createdBy: user.email,
      })
      setResult(res)
      setParsed(null)
    } catch (err) {
      console.error(err)
      setParseError('Ocurrió un error al importar. No se guardó nada, probá de nuevo.')
    } finally {
      setImporting(false)
    }
  }

  async function handleReset() {
    const ok = window.confirm(
      'Esto borra TODOS los tickets importados de PO (sourceSystem "clickup_po") y el historial de importaciones, para poder reimportar de cero. No se puede deshacer. ¿Continuar?',
    )
    if (!ok) return
    setResetting(true)
    setResetMessage(null)
    try {
      const res = await resetPoImport()
      setResetMessage(
        `Se borraron ${res.deletedTickets} tickets y ${res.deletedBatches} registros de importación. Ya podés volver a importar.`,
      )
    } catch (err) {
      console.error(err)
      setResetMessage('No se pudo resetear. Probá de nuevo.')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Importar planilla de PO</h1>
        <p className="text-sm text-slate-500">
          Subí el Excel de "Seguimiento de Proyectos PO" (hoja "Consolidado"). Se
          detectan las columnas por nombre, así que sirve tanto para este archivo
          como para versiones futuras con la misma estructura.
        </p>
      </div>

      {!result && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleFile(file)
            }}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Elegir archivo .xlsx
          </button>
          {fileName && <p className="mt-2 text-xs text-slate-500">{fileName}</p>}
        </div>
      )}

      <details className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
        <summary className="cursor-pointer font-medium text-slate-600">
          ¿Ya importaste antes y necesitás corregir datos? Reimportar de cero
        </summary>
        <div className="mt-2 space-y-2 text-slate-500">
          <p>
            El importador salta las filas cuyo Nro Pedido ya existe, así que
            volver a subir el mismo archivo no corrige tickets que ya se
            crearon con datos viejos. Este botón borra todos los tickets de PO
            (y el historial de importación) para poder reimportar limpio.
          </p>
          <button
            onClick={handleReset}
            disabled={resetting}
            className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {resetting ? 'Borrando…' : 'Borrar tickets de PO importados y empezar de cero'}
          </button>
          {resetMessage && <p className="text-slate-600">{resetMessage}</p>}
        </div>
      </details>

      {parseError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {parseError}
        </div>
      )}

      {parsed && (
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
            <p>
              Hoja detectada: <span className="font-medium">{parsed.sheetName}</span> ·
              encabezado en fila {parsed.headerRowNumber} ·{' '}
              <span className="font-medium">{parsed.rows.length}</span> puntos PO
              encontrados.
            </p>
          </div>

          {parsed.warnings.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <p className="font-medium">Avisos ({parsed.warnings.length}):</p>
              <ul className="mt-1 list-inside list-disc space-y-0.5">
                {parsed.warnings.slice(0, 10).map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
                {parsed.warnings.length > 10 && (
                  <li>… y {parsed.warnings.length - 10} más.</li>
                )}
              </ul>
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Tarea</th>
                  <th className="px-3 py-2 font-medium">Estado</th>
                  <th className="px-3 py-2 font-medium">Prioridad</th>
                  <th className="px-3 py-2 font-medium">Dueño</th>
                  <th className="px-3 py-2 font-medium">Sistema</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {parsed.rows.slice(0, 8).map((r) => (
                  <tr key={r.rowNumber}>
                    <td className="max-w-xs truncate px-3 py-2 text-slate-900">{r.title}</td>
                    <td className="px-3 py-2 text-slate-600">{TICKET_STATUS_LABELS[r.status]}</td>
                    <td className="px-3 py-2 text-slate-600">{PRIORITY_LABELS[r.priority]}</td>
                    <td className="px-3 py-2 text-slate-600">{r.dueno ?? '—'}</td>
                    <td className="px-3 py-2 text-slate-600">{r.sistemaOrigen ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsed.rows.length > 8 && (
              <p className="border-t border-slate-100 px-3 py-2 text-xs text-slate-400">
                … y {parsed.rows.length - 8} filas más.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setParsed(null)
                setFileName(null)
              }}
              className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              disabled={importing}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {importing
                ? 'Importando…'
                : `Confirmar importación de ${parsed.rows.length} puntos`}
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="font-medium text-emerald-900">Importación completa.</p>
          <ul className="space-y-1 text-sm text-emerald-800">
            <li>{result.rowsFound} filas encontradas en la planilla.</li>
            <li>{result.rowsImported} tickets creados.</li>
            <li>
              {result.rowsSkipped} filas salteadas (ya existían — mismo Nro Pedido).
            </li>
            <li>{result.personsCreated} personas nuevas creadas automáticamente.</li>
          </ul>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/tickets')}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              Ver tickets
            </button>
            <button
              onClick={() => {
                setResult(null)
                setFileName(null)
              }}
              className="rounded-md px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              Importar otro archivo
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
