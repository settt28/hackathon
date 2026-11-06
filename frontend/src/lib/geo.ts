/**
 * Ubicación del usuario para que Paty responda con el distrito y la posta más cercana.
 * Se pide una sola vez (al primer mensaje) y se reutiliza. Si el usuario la niega o tarda, se sigue sin ella.
 */
type Coords = { latitude: number; longitude: number }

let cached: Promise<Coords | null> | null = null

/** `?lat=-11.93&lon=-76.69` en la URL fija la ubicación: para demos en una laptop sin GPS. */
function fromUrl(): Coords | null {
  const q = new URLSearchParams(location.search)
  const latitude = Number(q.get('lat'))
  const longitude = Number(q.get('lon'))
  return q.has('lat') && q.has('lon') && Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180 ? { latitude, longitude } : null
}

const urlCoords = fromUrl()

export function getPosition(): Promise<Coords | null> {
  if (urlCoords) return Promise.resolve(urlCoords)
  if (!('geolocation' in navigator)) return Promise.resolve(null)
  cached ??= new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      () => {
        cached = null // permitir reintentar en el siguiente mensaje
        resolve(null)
      },
      { timeout: 5000, maximumAge: 10 * 60 * 1000 },
    )
  })
  return cached
}
