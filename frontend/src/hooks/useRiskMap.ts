import { useEffect, useState } from 'react'
import { getMapaRiesgo, type RiskMap } from '../lib/api'
import { getPosition, onLocationMaybeAvailable } from '../lib/geo'

export type RiskMapState =
  | { kind: 'loading' }
  | { kind: 'no-gps' }
  | { kind: 'error'; message: string }
  /** `savedAt` con fecha = mapa guardado en el dispositivo (sin conexión), no recién calculado. */
  | { kind: 'ok'; map: RiskMap; savedAt: number | null }

/** Cada cuánto se refresca (lo indica el backend; mínimo 1 minuto). */
const refreshMs = (map: RiskMap) => Math.max(60, map.actualizarCadaSegundos) * 1000

// Último mapa recibido: al volver al inicio se muestra al instante en vez de esperar otra vez al servidor
let last: { map: RiskMap; at: number; savedAt: number | null } | null = null

/**
 * Pide el mapa de riesgo de la zona del usuario y lo refresca cada `actualizarCadaSegundos`.
 * Con la app en segundo plano no refresca (ahorra datos y batería): lo hace al volver.
 */
export function useRiskMap() {
  const [state, setState] = useState<RiskMapState>(() =>
    last ? { kind: 'ok', map: last.map, savedAt: last.savedAt } : { kind: 'loading' },
  )
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const ctrl = new AbortController()
    // due: tocaba refrescar mientras la app estaba oculta
    const refresh: { timer?: ReturnType<typeof setTimeout>; due: boolean } = { due: false }

    const schedule = (ms: number) => {
      refresh.timer = setTimeout(() => {
        if (document.hidden) refresh.due = true
        else void load()
      }, ms)
    }
    const onVisible = () => {
      if (!document.hidden && refresh.due) {
        refresh.due = false
        void load()
      }
    }

    async function load() {
      const pos = await getPosition()
      if (ctrl.signal.aborted) return
      if (!pos) return setState({ kind: 'no-gps' })
      try {
        const { data: map, savedAt } = await getMapaRiesgo(pos.latitude, pos.longitude, ctrl.signal)
        last = { map, at: Date.now(), savedAt }
        setState({ kind: 'ok', map, savedAt })
        // Con el mapa guardado se reintenta antes: en cuanto vuelva la señal debe actualizarse
        schedule(savedAt === null ? refreshMs(map) : 60_000)
      } catch (e) {
        if (!ctrl.signal.aborted) setState({ kind: 'error', message: (e as Error).message })
      }
    }

    document.addEventListener('visibilitychange', onVisible)
    // Con un mapa reciente (y sin "Reintentar") solo se programa el próximo refresco
    const age = last ? Date.now() - last.at : Infinity
    if (attempt === 0 && last && age < refreshMs(last.map)) schedule(refreshMs(last.map) - age)
    else void load()

    return () => {
      ctrl.abort()
      clearTimeout(refresh.timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [attempt])

  // Sin ubicación todavía: reintenta solo cuando se conceda el permiso o la persona vuelva a la app
  const waitingForGps = state.kind === 'no-gps'
  useEffect(() => {
    if (!waitingForGps) return
    return onLocationMaybeAvailable(() => setAttempt((a) => a + 1))
  }, [waitingForGps])

  const retry = () => {
    setState({ kind: 'loading' })
    setAttempt((a) => a + 1)
  }
  return { state, retry }
}
