import { useCallback, useEffect, useState } from 'react'

/** Los 5 estados visuales del medidor de red. */
export type NetworkQuality = 'excelente' | 'bueno' | 'malo' | 'horrible' | 'sin-datos'

export const NETWORK_STATES: NetworkQuality[] = ['excelente', 'bueno', 'malo', 'horrible', 'sin-datos']

/** Network Information API (no está en los tipos estándar del DOM ni en todos los navegadores). */
type NetworkInformation = EventTarget & { effectiveType?: string; downlink?: number }

function getConnection(): NetworkInformation | undefined {
  return (navigator as Navigator & { connection?: NetworkInformation }).connection
}

/** Traduce la información real del navegador a uno de los 5 estados. */
function readQuality(): NetworkQuality {
  if (!navigator.onLine) return 'sin-datos'
  const conn = getConnection()
  if (!conn?.effectiveType) return 'bueno' // API no disponible: se asume conexión aceptable
  switch (conn.effectiveType) {
    case '4g':
      return (conn.downlink ?? 10) >= 5 ? 'excelente' : 'bueno'
    case '3g':
      return 'malo'
    default: // '2g' | 'slow-2g'
      return 'horrible'
  }
}

/**
 * Hook que expone la calidad de red.
 * - Modo real: escucha eventos online/offline y cambios de la Network Information API.
 * - Modo simulación: `cycle()` recorre los 5 estados (útil para demos y pruebas de UI).
 */
export function useNetworkStatus() {
  const [quality, setQuality] = useState<NetworkQuality>(readQuality)
  const [simulated, setSimulated] = useState(false)

  useEffect(() => {
    if (simulated) return
    const update = () => setQuality(readQuality())
    const conn = getConnection()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    conn?.addEventListener('change', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
      conn?.removeEventListener('change', update)
    }
  }, [simulated])

  /** Pasa al siguiente estado y activa el modo simulación. */
  const cycle = useCallback(() => {
    setSimulated(true)
    setQuality((q) => NETWORK_STATES[(NETWORK_STATES.indexOf(q) + 1) % NETWORK_STATES.length])
  }, [])

  /** Vuelve a leer la red real. */
  const reset = useCallback(() => {
    setSimulated(false)
    setQuality(readQuality())
  }, [])

  return { quality, simulated, cycle, reset }
}
