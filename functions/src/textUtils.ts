/**
 * Copia liviana de src/lib/textUtils.ts — Functions es un paquete npm
 * separado del frontend (no comparten build), así que se duplica esta
 * utilidad de una línea en vez de armar un monorepo para tan poco.
 */
export function normalizeText(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}
