import { useEffect, useRef } from 'react'

/**
 * Botón / gesto "atrás" de Android: lo que está abierto encima de la pantalla (pop-up del mapa, llamada con Paty,
 * alerta del SAMU) se cierra primero, como en cualquier app. Cada uno se registra mientras está abierto; el último
 * en abrirse es el primero en cerrarse. Ver components/AndroidBackButton.tsx.
 */
const stack: { close: () => void }[] = []

/** Registra `close` como acción de "atrás" mientras `active` sea true. */
export function useBackHandler(active: boolean, close: () => void) {
  // Siempre la función más reciente, sin volver a registrarse en cada render
  const latest = useRef(close)
  useEffect(() => {
    latest.current = close
  })

  useEffect(() => {
    if (!active) return
    const entry = { close: () => latest.current() }
    stack.push(entry)
    return () => {
      const i = stack.lastIndexOf(entry)
      if (i >= 0) stack.splice(i, 1)
    }
  }, [active])
}

/** Cierra lo último que se abrió encima de la pantalla. False si no había nada abierto. */
export function closeTopOverlay(): boolean {
  const top = stack.at(-1)
  if (!top) return false
  top.close()
  return true
}
