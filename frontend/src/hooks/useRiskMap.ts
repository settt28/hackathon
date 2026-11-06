import { useEffect, useState } from 'react'
import { getMapaRiesgo, type RiskMap } from '../lib/api'
import { getPosition } from '../lib/geo'

export type RiskMapState =
  | { kind: 'loading' }
  | { kind: 'no-gps' }
  | { kind: 'error'; message: string }
  | { kind: 'ok'; map: RiskMap }

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
        const map = await getMapaRiesgo(pos.latitude, pos.longitude, ctrl.signal)
        setState({ kind: 'ok', map })
        refresh.timer = setTimeout(load, Math.max(60, map.actualizarCadaSegundos) * 1000)
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

  const retry = () => {
    setState({ kind: 'loading' })
    setAttempt((a) => a + 1)
  }
  return { state, retry }
}
