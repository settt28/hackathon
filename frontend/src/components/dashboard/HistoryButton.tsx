import type { FC } from 'react'
import { Clock, Expand } from 'lucide-react'

interface HistoryButtonProps {
  onClick?: () => void
}

/** Acceso a la bitácora de la zona y alertas (acento ámbar = información oficial). */
const HistoryButton: FC<HistoryButtonProps> = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 text-left shadow-sm transition-colors hover:border-amber-300 hover:bg-amber-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 active:scale-[0.99] dark:border-amber-400/25 dark:bg-[#12171f] dark:shadow-none dark:hover:border-amber-400/50 dark:hover:bg-[#161c26]"
  >
    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-300 bg-amber-50 dark:border-amber-400/40 dark:bg-amber-400/10">
      <Clock className="h-5 w-5 text-amber-600 dark:text-amber-300" aria-hidden />
    </span>
    <span className="min-w-0 flex-1">
      <span className="flex items-center gap-2">
        <span className="truncate text-[13px] font-bold text-slate-900 dark:text-white">Historial de la Zona &amp; Alertas</span>
        <span className="shrink-0 rounded-full bg-amber-100 px-2 py-px text-[9px] font-bold text-amber-700 dark:bg-amber-400/20 dark:text-amber-300">
          Oficial
        </span>
      </span>
      <span className="mt-0.5 block truncate text-[10px] text-slate-500 dark:text-slate-400">Toca para abrir la bitácora completa de seguridad</span>
    </span>
    <Expand className="h-4 w-4 shrink-0 text-amber-500 dark:text-amber-300" aria-hidden />
  </button>
)

export default HistoryButton
