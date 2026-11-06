import { useEffect, useState } from 'react'
import { getMapaRiesgo, type RiskMap } from '../lib/api'
import { getPosition, onLocationMaybeAvailable } from '../lib/geo'

export type RiskMapState =
  | { kind: 'loading' }
  | { kind: 'no-gps' }
  | { kind: 'error'; message: string }
  /** `savedAt` con fecha = mapa guardado en el dispositivo (sin conexión), no recién calculado. */
  | { kind: 'ok'; map: RiskMap; savedAt: number | null }

/** Pide el mapa de riesgo de la zona del usuario y lo refresca cada `actualizarCadaSegundos`. */
export function useRiskMap() {
  const [state, setState] = useState<RiskMapState>({ kind: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const ctrl = new AbortController()
    const refresh: { timer?: ReturnType<typeof setTimeout> } = {}

    const load = async () => {
      const pos = await getPosition()
      if (ctrl.signal.aborted) return
      if (!pos) return setState({ kind: 'no-gps' })
      try {
        const { data: map, savedAt } = await getMapaRiesgo(pos.latitude, pos.longitude, ctrl.signal)
        setState({ kind: 'ok', map, savedAt })
        // Con el mapa guardado se reintenta antes: en cuanto vuelva la señal debe actualizarse
        refresh.timer = setTimeout(load, (savedAt === null ? Math.max(60, map.actualizarCadaSegundos) : 60) * 1000)
      } catch (e) {
        if (!ctrl.signal.aborted) setState({ kind: 'error', message: (e as Error).message })
      }
    }
    void load()
    return () => {
      ctrl.abort()
      clearTimeout(refresh.timer)
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
