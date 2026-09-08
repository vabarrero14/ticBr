/** Valores no vacíos, únicos y ordenados — para armar opciones de filtro
 * dinámicas a partir de los datos ya cargados (en vez de un enum fijo). */
export function distinctValues<T>(items: T[], pick: (item: T) => string | undefined | null): string[] {
  return Array.from(new Set(items.map(pick).filter((v): v is string => Boolean(v)))).sort()
}
