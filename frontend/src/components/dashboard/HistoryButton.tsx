import type { FC } from 'react'
import { Clock, Maximize2 } from 'lucide-react'

interface HistoryButtonProps {
  onClick?: () => void
}

/** Acceso a la bitácora de la zona y alertas (acento ámbar = información oficial). */
const HistoryButton: FC<HistoryButtonProps> = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center gap-3.5 rounded-2xl border border-amber-300 bg-amber-50/60 px-4 py-3.5 text-left shadow-sm @5xl:gap-5 @5xl:rounded-3xl @5xl:px-6 @5xl:py-5 transition-colors hover:border-amber-400 hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 active:scale-[0.99] dark:border-amber-400/35 dark:bg-[#1a1a12] dark:shadow-none dark:hover:border-amber-400/60 dark:hover:bg-[#202016]"
  >
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-300 @5xl:h-14 @5xl:w-14 @5xl:rounded-2xl bg-amber-100/60 dark:border-amber-400/50 dark:bg-amber-400/10">
      <Clock className="h-5 w-5 @5xl:h-6 @5xl:w-6 text-amber-600 dark:text-amber-300" aria-hidden />
    </span>
    <span className="min-w-0 flex-1">
      <span className="flex items-center gap-2">
        <span className="truncate text-[13px] font-bold @5xl:text-lg text-slate-900 dark:text-white">Historial de la Zona &amp; Alertas</span>
        <span className="shrink-0 rounded-md bg-amber-100 px-1.5 py-px text-[10px] font-bold text-amber-700 @5xl:text-xs dark:bg-amber-400/20 dark:text-amber-300">
          Oficial
        </span>
      </span>
      <span className="mt-0.5 block truncate text-[10.5px] text-slate-500 @5xl:text-sm dark:text-slate-300/80">Toca para abrir la bitácora completa de seguridad</span>
    </span>
    <Maximize2 className="h-4 w-4 shrink-0 @5xl:h-5 @5xl:w-5 text-amber-500 dark:text-amber-300" aria-hidden />
  </button>
)

export default HistoryButton
