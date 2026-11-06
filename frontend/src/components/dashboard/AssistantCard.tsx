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
 * Modo claro: tarjeta azul sólida (llamada a la acción). Modo oscuro: tarjeta translúcida con borde cian.
 */
const AssistantCard: FC<AssistantCardProps> = ({ onOpenChat, onVoice }) => (
  <div className="relative flex items-center rounded-2xl border border-sky-600 bg-gradient-to-r from-sky-700 to-blue-600 shadow-[0_8px_24px_rgba(2,132,199,0.3)] transition hover:brightness-105 dark:border-cyan-400/30 dark:bg-[#0b1a26]/70 dark:bg-none dark:shadow-none dark:hover:border-cyan-300/60 dark:hover:brightness-100">
    <button
      type="button"
      onClick={onOpenChat}
      className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-3.5 pr-2 text-left @5xl:gap-5 @5xl:p-6 @5xl:pr-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white dark:focus-visible:ring-cyan-400"
    >
      {/* Mismo logo de Paty que en el chat (8 pétalos + nube con sol) */}
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/15 @5xl:h-16 @5xl:w-16 dark:bg-[#0e2230]">
        <PatyLogo className="h-11 w-11 @5xl:h-[3.75rem] @5xl:w-[3.75rem]" iconClassName="h-3 w-3 @5xl:h-4 @5xl:w-4" glow={false} />
      </span>
      <span className="min-w-0">
        <span className="block text-[10px] font-bold tracking-[0.14em] @5xl:text-xs text-sky-100 dark:text-cyan-300">ASISTENCIA POR VOZ Y CHAT</span>
        <span className="block text-lg font-bold leading-tight text-white @5xl:text-2xl">Habla con Paty</span>
        <span className="block truncate text-[11px] italic @5xl:text-sm text-sky-100/80 dark:text-slate-300/80">“¿Necesitas acompañamiento seguro?”</span>
      </span>
    </button>

    <button
      type="button"
      onClick={onVoice}
      aria-label="Hablar con Paty por voz"
      className="mr-3.5 flex h-11 w-11 @5xl:mr-6 @5xl:h-14 @5xl:w-14 @5xl:rounded-2xl shrink-0 items-center justify-center rounded-xl border border-white/30 bg-white/15 text-white transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-90 dark:border-cyan-400/40 dark:bg-cyan-400/10 dark:text-cyan-300 dark:hover:bg-cyan-400/20 dark:focus-visible:ring-cyan-400"
    >
      <Mic className="h-5 w-5 @5xl:h-6 @5xl:w-6" />
    </button>
  </div>
)

export default AssistantCard
