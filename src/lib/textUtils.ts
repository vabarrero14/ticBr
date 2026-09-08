/**
 * Normaliza texto para comparar/matchear de forma tolerante a mayúsculas,
 * espacios y tildes (ej: "Dina Insfrán" y "Dina Insfran" deben matchear).
 */
export function normalizeText(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}
