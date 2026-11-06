import { useEffect, useRef, useState, type FC } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { LogOut } from 'lucide-react'
import { App } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { closeTopOverlay } from '../hooks/useBackHandler'

/** Tiempo para el segundo toque que cierra la app. */
const EXIT_WINDOW_MS = 2000

/**
 * Botón y gesto "atrás" de Android dentro del APK (sin esto, Android cerraba la app en cualquier pantalla):
 * 1. Si hay algo abierto encima (pop-up del mapa, llamada, alerta), lo cierra.
 * 2. En cualquier otra pantalla, vuelve a la anterior; si no hay anterior (se abrió directo), al inicio.
 * 3. En el inicio, el primer toque avisa "Presiona atrás otra vez para salir"; el segundo, dentro de 2 s, sale.
 * En la web no hace nada: el navegador ya maneja su propio "atrás".
 */
const AndroidBackButton: FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [hint, setHint] = useState(false)
  const lastPress = useRef(0)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // El listener se registra una vez; lee la ruta y la navegación más recientes desde aquí
  const current = useRef({ location, navigate })
  useEffect(() => {
    current.current = { location, navigate }
  })

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    const listener = App.addListener('backButton', () => {
      if (closeTopOverlay()) return

      const { location: loc, navigate: go } = current.current
      if (loc.pathname !== '/') {
        // "default" = primera pantalla de la sesión: no hay historial dentro de la app al que volver
        if (loc.key === 'default') go('/', { replace: true })
        else go(-1)
        return
      }

      const now = Date.now()
      if (now - lastPress.current < EXIT_WINDOW_MS) {
        void App.exitApp()
        return
      }
      lastPress.current = now
      setHint(true)
      clearTimeout(hideTimer.current)
      hideTimer.current = setTimeout(() => setHint(false), EXIT_WINDOW_MS)
    })
    return () => {
      void listener.then((l) => l.remove())
      clearTimeout(hideTimer.current)
    }
  }, [])

  // El aviso solo tiene sentido en el inicio: si se navegó a otra pantalla, no se muestra
  if (!hint || location.pathname !== '/') return null
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(1.5rem+var(--safe-bottom))] z-[60] flex justify-center px-4 motion-safe:animate-fade-in"
    >
      <span className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-4 py-2.5 text-[13px] font-semibold text-slate-800 shadow-lg backdrop-blur dark:border-cyan-400/30 dark:bg-[#0b1a26]/95 dark:text-white dark:shadow-[0_0_24px_rgba(34,211,238,0.15)]">
        <LogOut className="h-4 w-4 shrink-0 text-sky-600 dark:text-cyan-300" aria-hidden />
        Presiona atrás otra vez para salir
      </span>
    </div>
  )
}

export default AndroidBackButton
