interface BarDatum {
  label: string
  value: number
}

/**
 * Barras horizontales para comparar magnitud entre categorías (conteos por
 * plataforma/sistema/tipo/persona/gerencia). Se usa barra en vez de torta:
 * con más de 3-4 categorías una torta deja de ser legible, una barra no.
 * Un solo color (no hace falta leyenda, hay una sola serie). Si hay más
 * categorías que `maxBars`, el resto se pliega en "Otros" en vez de generar
 * más barras diminutas.
 */
export function BarChart({ data, maxBars = 8 }: { data: BarDatum[]; maxBars?: number }) {
  const sorted = [...data].sort((a, b) => b.value - a.value)
  const shown = sorted.slice(0, maxBars)
  const restTotal = sorted.slice(maxBars).reduce((sum, d) => sum + d.value, 0)
  const bars = restTotal > 0 ? [...shown, { label: 'Otros', value: restTotal }] : shown
  const max = Math.max(...bars.map((b) => b.value), 1)

  if (bars.length === 0) {
    return <p className="text-sm text-slate-400">Sin datos todavía.</p>
  }

  return (
    <div className="space-y-2">
      {bars.map((b) => (
        <div key={b.label} className="flex items-center gap-2" title={`${b.label}: ${b.value}`}>
          <span className="w-24 shrink-0 truncate text-xs text-slate-600">{b.label}</span>
          <div className="h-4 min-w-0 flex-1 rounded-full bg-slate-100">
            <div
              className="h-4 rounded-full bg-[#2a78d6]"
              style={{ width: `${Math.max((b.value / max) * 100, 3)}%` }}
            />
          </div>
          <span className="w-6 shrink-0 text-right text-xs font-medium text-slate-900">
            {b.value}
          </span>
        </div>
      ))}
    </div>
  )
}
