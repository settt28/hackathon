/**
 * Ubicación del usuario para que Paty responda con el distrito y la posta más cercana.
 * Se pide una sola vez (al primer mensaje) y se reutiliza. Si el usuario la niega o tarda, se sigue sin ella.
 */
type Coords = { latitude: number; longitude: number }

let cached: Promise<Coords | null> | null = null

export function getPosition(): Promise<Coords | null> {
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
