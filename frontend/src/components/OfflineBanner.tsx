import type { FC } from 'react'
import { WifiOff } from 'lucide-react'
import { useOnline } from '../hooks/useOnline'

/**
 * Franja "No conectado" en la parte superior de la app.
 *
 * Aparece en cuanto la app no puede hablar con el servidor —sea porque el teléfono no tiene datos
 * o porque el backend no responde— y desaparece sola al volver la conexión. No es un cartel que
 * bloquee: debajo se sigue usando todo con los datos guardados en el dispositivo.
 *
 * Ocupa espacio en el layout (no flota encima) para no tapar la cabecera de ninguna pantalla.
 */
const OfflineBanner: FC = () => {
  const online = useOnline()
  if (online) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="z-50 flex shrink-0 items-center justify-center gap-2 bg-amber-500 px-3 py-1.5 text-center text-[12px] font-semibold text-amber-950 dark:bg-amber-400/90"
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>
        No conectado
        <span className="ml-1.5 font-normal opacity-80">· estás viendo los datos guardados en tu teléfono</span>
      </span>
    </div>
  )
}

export default OfflineBanner
