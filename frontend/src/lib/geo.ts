/**
 * Ubicación del usuario para que Paty responda con el distrito y la posta más cercana.
 *
 * Funciona sin internet:
 *  - El chip GPS del teléfono es satelital y NO necesita datos. Cuando no hay conexión se pide
 *    `enableHighAccuracy: true` (satélite) con más tiempo de espera, porque la ubicación por
 *    antenas/wifi —que es la rápida— sí necesita red y fallaría.
 *  - La última posición buena queda guardada en el dispositivo, así la app abre mostrando la zona
 *    correcta incluso antes de tener señal (o si el GPS no engancha bajo techo), y sobrevive a
 *    cerrar y reabrir la app.
 *  - En una emergencia nadie puede esperar al GPS: `getLastPosition()` responde al instante y
 *    `getPositionWithin(ms)` pone un plazo máximo.
 */
type Coords = { latitude: number; longitude: number }

/** De dónde salió la ubicación: del GPS ahora, de la URL (demos) o de la copia guardada. */
export type PositionSource = 'gps' | 'url' | 'guardada'

export interface PositionFix extends Coords {
  source: PositionSource
  /** Cuándo se obtuvo (Date.now()). Para avisar "ubicación de hace 2 h" cuando es la guardada. */
  at: number
}

const STORAGE_KEY = 'paty:ultima-ubicacion'

/** Más allá de una semana, una ubicación guardada ya no representa dónde está la persona. */
const MAX_STORED_AGE_MS = 7 * 24 * 60 * 60 * 1000

/** `?lat=-11.93&lon=-76.69` en la URL fija la ubicación: para demos en una laptop sin GPS. */
function fromUrl(): Coords | null {
  const q = new URLSearchParams(location.search)
  const latitude = Number(q.get('lat'))
  const longitude = Number(q.get('lon'))
  return q.has('lat') && q.has('lon') && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 ? { latitude, longitude } : null
}

function readStored(): PositionFix | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const v = JSON.parse(raw) as Partial<PositionFix>
    if (typeof v.latitude !== 'number' || typeof v.longitude !== 'number' || typeof v.at !== 'number') return null
    if (Date.now() - v.at > MAX_STORED_AGE_MS) return null
    return { latitude: v.latitude, longitude: v.longitude, at: v.at, source: 'guardada' }
  } catch {
    return null // almacenamiento bloqueado o JSON corrupto: se sigue sin ubicación guardada
  }
}

function store(coords: Coords) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...coords, at: Date.now() }))
  } catch {
    // Sin espacio o en modo incógnito: la ubicación solo vivirá en esta sesión
  }
}

const urlCoords = fromUrl()
let cached: Promise<PositionFix | null> | null = null
/** Última conocida en memoria; arranca con la de la URL o la guardada en el dispositivo. */
let last: PositionFix | null = urlCoords ? { ...urlCoords, source: 'url', at: Date.now() } : readStored()

/** La última ubicación conocida, sin esperar nada (para emergencias). */
export const getLastPosition = (): Coords | null =>
  last ? { latitude: last.latitude, longitude: last.longitude } : null

/** Igual que `getLastPosition` pero con el detalle de origen y antigüedad. */
export const getLastPositionFix = (): PositionFix | null => last

function askGeolocation(): Promise<PositionFix | null> {
  const offline = !navigator.onLine
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const fix = { latitude: coords.latitude, longitude: coords.longitude }
        store(fix)
        last = { ...fix, source: 'gps', at: Date.now() }
        resolve(last)
      },
      () => resolve(null),
      offline
        ? // Sin red solo queda el satélite: tarda más en enganchar, así que se le da 30 s.
          { timeout: 30000, maximumAge: 10 * 60 * 1000, enableHighAccuracy: true }
        : // Con red basta la ubicación por antenas/wifi: llega en segundos y el distrito es suficiente.
          // 15 s porque el tiempo corre desde que se acepta el permiso y un GPS "en frío" tarda más de 5 s.
          { timeout: 15000, maximumAge: 10 * 60 * 1000, enableHighAccuracy: false },
    )
  })
}

/**
 * Ubicación con detalle de su origen. Se pide una vez y se reutiliza.
 * Si el GPS falla (permiso negado, sin señal bajo techo), cae a la última guardada.
 */
export function getPositionFix(): Promise<PositionFix | null> {
  if (urlCoords) return Promise.resolve({ ...urlCoords, source: 'url', at: Date.now() })
  cached ??= (!('geolocation' in navigator) ? Promise.resolve(null) : askGeolocation()).then((fix) => {
    const result = fix ?? readStored()
    // Sin ninguna ubicación: se permite reintentar (el permiso puede concederse después)
    if (!result) cached = null
    else last ??= result
    return result
  })
  return cached
}

/** Solo las coordenadas, para quien no necesita saber de dónde salieron. */
export function getPosition(): Promise<Coords | null> {
  return getPositionFix().then((fix) => (fix ? { latitude: fix.latitude, longitude: fix.longitude } : null))
}

/** La ubicación si llega en `ms`; si no, la última conocida. El pedido sigue en curso para la próxima consulta. */
export function getPositionWithin(ms: number): Promise<Coords | null> {
  return Promise.race([getPosition(), new Promise<Coords | null>((resolve) => setTimeout(() => resolve(getLastPosition()), ms))])
}

/**
 * Avisa cuando vale la pena volver a pedir la ubicación: el permiso pasó a "concedido" (si el navegador lo informa)
 * o la persona volvió a la app (por ejemplo, tras aceptar el permiso en el diálogo de Android). Devuelve cómo dejar de escuchar.
 */
export function onLocationMaybeAvailable(callback: () => void): () => void {
  let status: PermissionStatus | null = null
  const onPermission = () => status?.state === 'granted' && callback()
  const onVisible = () => document.visibilityState === 'visible' && callback()
  navigator.permissions
    ?.query({ name: 'geolocation' })
    .then((s) => {
      status = s
      s.addEventListener('change', onPermission)
    })
    .catch(() => {})
  document.addEventListener('visibilitychange', onVisible)
  return () => {
    status?.removeEventListener('change', onPermission)
    document.removeEventListener('visibilitychange', onVisible)
  }
}
