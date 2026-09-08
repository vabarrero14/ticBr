const MONTH_NAMES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
]

/** Mes actual en formato "YYYY-MM", el mismo que usa <input type="month">. */
export function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/** "2026-09" → "septiembre 2026". Si no matchea el formato, devuelve tal cual. */
export function formatMonth(ym: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(ym)
  if (!match) return ym
  const [, year, month] = match
  const name = MONTH_NAMES[Number(month) - 1]
  return name ? `${name} ${year}` : ym
}
