import type { FC } from 'react'
import { Mic } from 'lucide-react'
import PatyLogo from '../paty/PatyLogo'

interface AssistantCardProps {
  /** Abre el chat de Paty. */
  onOpenChat: () => void
  /** Inicia la interacción por voz. */
  onVoice: () => void
}

/**
 * Acceso al asistente Paty. Toda la tarjeta abre el chat;
 * el micrófono es un botón separado (no anidado) para que ambos sean accesibles.
 * Modo claro: tarjeta azul sólida (llamada a la acción). Modo oscuro: tarjeta oscura con borde cian.
 */
const AssistantCard: FC<AssistantCardProps> = ({ onOpenChat, onVoice }) => (
  <div className="relative flex items-center rounded-2xl border border-sky-600 bg-gradient-to-r from-sky-700 to-blue-600 shadow-[0_8px_24px_rgba(2,132,199,0.3)] transition hover:brightness-105 dark:border-cyan-400/40 dark:bg-[#0b1a26] dark:bg-none dark:shadow-[0_0_24px_rgba(34,211,238,0.12)] dark:hover:border-cyan-300/70 dark:hover:brightness-100">
    <button
      type="button"
      onClick={onOpenChat}
      className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-3.5 pr-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white dark:focus-visible:ring-cyan-400"
    >
      <PatyLogo className="h-11 w-11" iconClassName="h-3 w-3" glow={false} />
      <span className="min-w-0">
        <span className="block text-[9px] font-bold tracking-[0.16em] text-sky-100 dark:text-cyan-300">ASISTENCIA POR VOZ Y CHAT</span>
        <span className="block text-base font-bold text-white">Habla con Paty</span>
        <span className="block truncate text-[11px] italic text-sky-100/80 dark:text-slate-400">“¿Necesitas acompañamiento seguro?”</span>
      </span>
    </button>

    <button
      type="button"
      onClick={onVoice}
      aria-label="Hablar con Paty por voz"
      className="mr-3.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/30 bg-white/15 text-white transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-90 dark:border-cyan-400/40 dark:bg-cyan-400/10 dark:text-cyan-300 dark:hover:bg-cyan-400/20 dark:focus-visible:ring-cyan-400"
    >
      <Mic className="h-5 w-5" />
    </button>
  </div>
)

export default AssistantCard
