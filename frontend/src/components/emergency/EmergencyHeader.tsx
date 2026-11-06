import type { FC } from 'react'
import { ChevronLeft } from 'lucide-react'

interface EmergencyHeaderProps {
  onBack: () => void
}

/** Cabecera: botón para volver y etiqueta "MODO EMERGENCIA" con punto rojo pulsante. */
const EmergencyHeader: FC<EmergencyHeaderProps> = ({ onBack }) => (
  <header className="flex items-center justify-between px-4">
    <button
      type="button"
      onClick={onBack}
      aria-label="Volver al inicio"
      className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-sky-600 shadow-sm transition-colors hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 active:scale-95 dark:border-cyan-400/25 dark:bg-[#0b1a26] dark:text-cyan-300 dark:shadow-none dark:hover:bg-cyan-400/10 dark:focus-visible:ring-cyan-400"
    >
      <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
    </button>

    <span className="flex items-center gap-2 rounded-full border border-red-300 bg-red-50 py-1.5 pl-2 pr-4 text-xs font-extrabold tracking-[0.2em] text-red-700 dark:border-red-500/50 dark:bg-red-950/40 dark:text-red-200">
      <span className="relative flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500/25" aria-hidden>
        <span className="h-2 w-2 rounded-full bg-red-500 motion-safe:animate-pulse" />
      </span>
      MODO EMERGENCIA
    </span>
  </header>
)

export default EmergencyHeader
