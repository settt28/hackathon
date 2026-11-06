import type { FC } from 'react'
import { ChevronLeft, History } from 'lucide-react'

interface HistoryHeaderProps {
  onBack: () => void
}

/** Cabecera: volver, ícono ámbar del historial y título de la pantalla. */
const HistoryHeader: FC<HistoryHeaderProps> = ({ onBack }) => (
  <header className="flex items-center gap-3 px-4">
    <button
      type="button"
      onClick={onBack}
      aria-label="Volver al inicio"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-sky-600 shadow-sm transition-colors hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 active:scale-95 dark:border-cyan-400/25 dark:bg-[#0b1a26] dark:text-cyan-300 dark:shadow-none dark:hover:bg-cyan-400/10 dark:focus-visible:ring-cyan-400"
    >
      <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
    </button>
    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-300 bg-amber-50 text-amber-600 dark:border-amber-400/50 dark:bg-amber-400/10 dark:text-amber-300 dark:shadow-[0_0_16px_rgba(251,191,36,0.2)]">
      <History className="h-5 w-5" aria-hidden />
    </span>
    <h1 className="min-w-0 text-[17px] font-extrabold leading-tight text-slate-900 dark:text-white">Historial de la Zona &amp; Alertas</h1>
  </header>
)

export default HistoryHeader
