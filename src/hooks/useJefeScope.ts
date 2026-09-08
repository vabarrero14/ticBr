import { useState } from 'react'

const STORAGE_KEY = 'ticbr.jefeScope'
/** Alcance por defecto: solo el equipo de Victor Barreto. '' = Todo TIC. */
const DEFAULT_JEFE = 'Victor Barreto'

function readStored(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ?? DEFAULT_JEFE
  } catch {
    return DEFAULT_JEFE
  }
}

/**
 * Alcance de "Jefe TIC" para filtrar tickets de PO — configurable en vez de
 * hardcodeado, para poder pasar a ver métricas de todo TIC ('') el día que
 * haga falta. Se persiste en localStorage (preferencia del navegador, no
 * dato compartido). Los tickets sin po.jefeTic (no vienen de PO) nunca se
 * ocultan por este filtro.
 */
export function useJefeScope() {
  const [jefe, setJefeState] = useState<string>(readStored)

  function setJefe(value: string) {
    setJefeState(value)
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {
      // localStorage puede no estar disponible (ventana privada, etc.) — no es crítico
    }
  }

  return [jefe, setJefe] as const
}
