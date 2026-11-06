import { Mic, PhoneOff, X } from 'lucide-react'
import clsx from 'clsx'
import PatyLogo from './PatyLogo'
import type { CallState } from '../../hooks/usePatyCall'

interface CallOverlayProps {
  state: CallState
  heard: string
  said: string
  error: string
  onHangUp: () => void
  onClose: () => void
}

const STATUS: Record<CallState, string> = {
  idle: '',
  listening: 'Te escucho… habla ahora',
  thinking: 'Paty está pensando…',
  speaking: 'Paty está hablando…',
  unsupported: 'Tu navegador no permite hablar con Paty',
  error: 'Se cortó la llamada',
}

/** Pantalla de llamada con Paty: avatar que reacciona al estado, lo que entendió, lo que responde y colgar. */
export default function CallOverlay({ state, heard, said, error, onHangUp, onClose }: CallOverlayProps) {
  const active = state === 'listening' || state === 'thinking' || state === 'speaking'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Llamada con Paty"
      className="absolute inset-0 z-40 flex flex-col items-center bg-gradient-to-b from-[#f4f7fb] to-sky-100 px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] text-center dark:from-[#070d17] dark:to-[#0b1d2c]"
    >
      <p className="text-xs font-bold tracking-[0.18em] text-sky-700 dark:text-cyan-300">LLAMADA CON PATY</p>

      {/* Avatar: ondas mientras escucha, giro suave mientras piensa, pulso mientras habla */}
      <div className="relative mt-10 flex h-56 w-56 items-center justify-center">
        {state === 'listening' && (
          <>
            <span className="absolute inset-4 rounded-full bg-sky-400/25 motion-safe:animate-pulse-ring dark:bg-cyan-400/20" aria-hidden />
            <span className="absolute inset-4 rounded-full bg-sky-400/20 motion-safe:animate-pulse-ring [animation-delay:1.1s] dark:bg-cyan-400/15" aria-hidden />
          </>
        )}
        {state === 'speaking' && <span className="absolute inset-8 rounded-full bg-amber-300/30 motion-safe:animate-ping" aria-hidden />}
        <div className={clsx('relative', state === 'thinking' && 'motion-safe:animate-pulse')}>
          <PatyLogo />
        </div>
      </div>

      <p className="mt-6 text-xl font-extrabold text-slate-900 dark:text-white" aria-live="polite">
        {STATUS[state]}
      </p>
      {state === 'listening' && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
          <Mic className="h-4 w-4 text-red-500" aria-hidden /> Micrófono abierto
        </p>
      )}

      {/* Lo que entendió y lo que responde, para quien no escucha bien */}
      <div className="mt-6 w-full max-w-sm space-y-3 overflow-y-auto text-left">
        {heard && (
          <p className="ml-auto w-fit max-w-[90%] rounded-2xl rounded-br-md bg-sky-600 px-3.5 py-2 text-sm text-white dark:bg-cyan-400 dark:text-[#070d17]">
            {heard}
          </p>
        )}
        {said && state !== 'listening' && (
          // El relleno va afuera: si no, la línea recortada asoma en el borde inferior
          <div className="w-fit max-w-[95%] rounded-2xl rounded-bl-md border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 dark:border-cyan-400/20 dark:bg-[#0b1a26] dark:text-slate-100">
            <p className="line-clamp-6">{said}</p>
          </div>
        )}
        {state === 'unsupported' && (
          <p className="text-center text-sm text-slate-600 dark:text-slate-300">
            Abre la app en Chrome, Edge o Safari para hablar con Paty, o escríbele en el chat.
          </p>
        )}
        {state === 'error' && <p className="text-center text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>

      <div className="mt-auto pt-6">
        {active ? (
          <button
            type="button"
            onClick={onHangUp}
            aria-label="Colgar"
            className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white shadow-[0_8px_30px_rgba(239,68,68,0.45)] transition hover:bg-red-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-300 active:scale-90"
          >
            <PhoneOff className="h-7 w-7" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-2 rounded-full border border-slate-300 px-5 py-2.5 font-semibold text-slate-700 dark:border-white/20 dark:text-slate-200"
          >
            <X className="h-4 w-4" aria-hidden /> Volver al chat
          </button>
        )}
        {active && <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">Colgar</p>}
      </div>
    </div>
  )
}
