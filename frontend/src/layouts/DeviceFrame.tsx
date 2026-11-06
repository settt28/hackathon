import type { FC, ReactNode } from 'react'
import { BatteryFull, Signal, Wifi } from 'lucide-react'

interface DeviceFrameProps {
  children: ReactNode
}

/**
 * Marco de dispositivo para la presentación.
 * - Móvil real (< sm): la app ocupa toda la pantalla, sin marco ni barra de estado falsa
 *   (el teléfono ya muestra la suya).
 * - sm en adelante: se dibuja el teléfono con barra de estado "9:41", como en el diseño
 *   (borde gris claro en modo claro, violeta en modo oscuro).
 */
const DeviceFrame: FC<DeviceFrameProps> = ({ children }) => (
  <div className="min-h-[100dvh] bg-slate-200 bg-[radial-gradient(rgba(15,23,42,0.08)_1px,transparent_1px)] bg-[length:14px_14px] transition-colors sm:flex sm:items-center sm:justify-center sm:p-6 dark:bg-[#1f1f22] dark:bg-[radial-gradient(rgba(255,255,255,0.06)_1px,transparent_1px)]">
    <div className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-[#f4f7fb] transition-colors sm:h-[844px] sm:max-h-[calc(100dvh-3rem)] sm:w-[390px] sm:rounded-[2.75rem] sm:border-[3px] sm:border-slate-300 sm:shadow-[0_0_0_6px_#ffffff,0_30px_80px_rgba(15,23,42,0.25)] dark:bg-[#070d17] dark:sm:border-[#7c6cf0] dark:sm:shadow-[0_0_0_6px_#0b0b10,0_30px_80px_rgba(0,0,0,0.6)]">
      {/* Barra de estado simulada (solo en el marco) */}
      <div className="hidden shrink-0 items-center justify-between px-8 pb-1 pt-4 text-[13px] font-semibold text-slate-900 sm:flex dark:text-white">
        <span>9:41</span>
        <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300" aria-hidden>
          <Signal className="h-3.5 w-3.5" />
          <Wifi className="h-3.5 w-3.5" />
          <BatteryFull className="h-4 w-4" />
        </span>
      </div>

      {children}

      {/* Indicador de inicio (home indicator) */}
      <div className="hidden shrink-0 justify-center pb-2 pt-1 sm:flex" aria-hidden>
        <span className="h-1 w-32 rounded-full bg-slate-900/25 dark:bg-white/25" />
      </div>
    </div>
  </div>
)

export default DeviceFrame
