/**
 * Estado de conexión de la app, en un solo lugar.
 *
 * `navigator.onLine` solo dice que el dispositivo tiene *un* enlace de red: con wifi de hotel sin
 * aceptar los términos, o con el servidor caído, el navegador sigue diciendo "online" y la app
 * mentiría al usuario. Por eso se combina con lo que de verdad pasó al hablar con el backend.
 */

type Listener = () => void

const listeners = new Set<Listener>()

/** ¿La última petición al backend llegó a su destino? */
let serverReachable = true

function emit() {
  for (const l of listeners) l()
}

/** Lo informa el cliente HTTP: true si el servidor respondió, false si la red falló o se agotó el tiempo. */
export function reportServerReachable(reachable: boolean) {
  if (serverReachable === reachable) return
  serverReachable = reachable
  emit()
}

/** True solo si el dispositivo tiene red Y el backend respondió la última vez. */
export function isOnline(): boolean {
  return navigator.onLine && serverReachable
}

/** Suscripción para `useSyncExternalStore`. */
export function subscribeConnection(onChange: Listener): () => void {
  listeners.add(onChange)
  const onNetworkChange = () => {
    // Al recuperar el enlace de red se vuelve a dar el beneficio de la duda al servidor:
    // si no, un fallo viejo dejaría el cartel de "sin conexión" pegado para siempre.
    if (navigator.onLine) serverReachable = true
    onChange()
  }
  window.addEventListener('online', onNetworkChange)
  window.addEventListener('offline', onNetworkChange)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener('online', onNetworkChange)
    window.removeEventListener('offline', onNetworkChange)
  }
}
