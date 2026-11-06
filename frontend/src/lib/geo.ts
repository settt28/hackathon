/**
 * Ubicación del usuario para que Paty responda con el distrito y la posta más cercana.
 * Se pide una vez y se reutiliza. Si el usuario la niega o tarda, se sigue sin ella y se reintenta más tarde.
 */
type Coords = { latitude: number; longitude: number }

/** `?lat=-11.93&lon=-76.69` en la URL fija la ubicación: para demos en una laptop sin GPS. */
function fromUrl(): Coords | null {
  const q = new URLSearchParams(location.search)
  const latitude = Number(q.get('lat'))
  const longitude = Number(q.get('lon'))
  return q.has('lat') && q.has('lon') && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 ? { latitude, longitude } : null
}

const urlCoords = fromUrl()
let cached: Promise<Coords | null> | null = null
let last: Coords | null = urlCoords

/** La última ubicación conocida, sin esperar nada (para emergencias). */
export const getLastPosition = () => last

/** La ubicación si llega en `ms`; si no, la última conocida. El pedido sigue en curso para la próxima consulta. */
export function getPositionWithin(ms: number): Promise<Coords | null> {
  return Promise.race([getPosition(), new Promise<Coords | null>((resolve) => setTimeout(() => resolve(last), ms))])
}

export function getPosition(): Promise<Coords | null> {
  if (urlCoords) return Promise.resolve(urlCoords)
  if (!('geolocation' in navigator)) return Promise.resolve(null)
  cached ??= new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        last = { latitude: coords.latitude, longitude: coords.longitude }
        resolve(last)
      },
      () => {
        cached = null // permitir reintentar
        resolve(null)
      },
      // 15 s: el tiempo corre desde que se acepta el permiso y un GPS "en frío" suele tardar más de 5 s.
      // Sin alta precisión: basta el distrito, y la ubicación por red llega mucho antes.
      { timeout: 15000, maximumAge: 10 * 60 * 1000, enableHighAccuracy: false },
    )
  })
  return cached
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
