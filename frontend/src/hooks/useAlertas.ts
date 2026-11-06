import { useCallback, useEffect, useMemo, useState } from 'react'
import { getAlertas, getUbicacion, type Alert, type AlertLevel, type Dominio, type UserLocation } from '../lib/api'
import { getPosition, onLocationMaybeAvailable } from '../lib/geo'

export type LoadStatus = 'loading' | 'ok' | 'error'

const LEVEL_ORDER: Record<AlertLevel, number> = { Critico: 0, Alto: 1, Medio: 2, Bajo: 3 }

let cachedLocation: Promise<UserLocation | null> | null = null

/** Distrito del usuario. Se resuelve una vez y se comparte entre componentes; si falla, se reintenta al volver a montar. */
function getUserLocation(): Promise<UserLocation | null> {
  cachedLocation ??= getPosition()
    .then((pos) => (pos ? getUbicacion(pos.latitude, pos.longitude) : null))
    .catch(() => null)
    .then((location) => {
      if (!location) cachedLocation = null
      return location
    })
  return cachedLocation
}

export function useUserLocation(): UserLocation | null {
  const [location, setLocation] = useState<UserLocation | null>(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    void getUserLocation().then((l) => {
      if (active) setLocation(l)
    })
    return () => {
      active = false
    }
  }, [attempt])
  // Sin ubicación: reintenta cuando se conceda el permiso o la persona vuelva a la app
  useEffect(() => {
    if (location) return
    return onLocationMaybeAvailable(() => setAttempt((a) => a + 1))
  }, [location])
  return location
}

/**
 * Un peligro no se detiene en el límite del distrito: la "zona" incluye toda la provincia
 * (los 4 primeros dígitos del ubigeo). Devuelve qué tan cerca está la alerta del usuario.
 */
export function zonaDeAlerta(alert: Alert, location: UserLocation | null): 'distrito' | 'provincia' | 'otra' {
  if (!location) return 'otra'
  if (alert.ubigeo === location.ubigeo) return 'distrito'
  return alert.ubigeo.slice(0, 4) === location.ubigeo.slice(0, 4) ? 'provincia' : 'otra'
}

/**
 * Alertas vigentes de un dominio, de mayor a menor gravedad.
 * `deMiZona` son las que aplican al usuario (todas si no se conoce su ubicación); `otras`, las demás regiones.
 * No espera al GPS para pedir datos: el permiso puede quedar sin responder y la pantalla no debe bloquearse.
 */
export function useAlertas(dominio: Dominio) {
  const [alertas, setAlertas] = useState<Alert[]>([])
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [attempt, setAttempt] = useState(0)
  const location = useUserLocation()

  useEffect(() => {
    const ctrl = new AbortController()
    getAlertas(dominio, ctrl.signal)
      .then((data) => {
        if (ctrl.signal.aborted) return
        setAlertas([...data].sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]))
        setStatus('ok')
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setStatus('error')
      })
    return () => ctrl.abort()
  }, [dominio, attempt])

  const reload = useCallback(() => {
    setStatus('loading')
    setAttempt((a) => a + 1)
  }, [])

  const { deMiZona, otras } = useMemo(() => {
    if (!location) return { deMiZona: alertas, otras: [] as Alert[] }
    return {
      deMiZona: alertas.filter((a) => zonaDeAlerta(a, location) !== 'otra'),
      otras: alertas.filter((a) => zonaDeAlerta(a, location) === 'otra'),
    }
  }, [alertas, location])

  return { deMiZona, otras, location, status, reload }
}
