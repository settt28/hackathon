import type { FC } from 'react'
import { CircleAlert } from 'lucide-react'

interface SOSFooterProps {
  onPress?: () => void
}

/** Botón de emergencia SOS: halo fijo + ondas rojas continuas para que sea lo más visible de la pantalla. */
const SOSFooter: FC<SOSFooterProps> = ({ onPress }) => (
  // short: celular en horizontal (poca altura): el SOS queda fijo en la esquina para que nunca se pierda de vista
  <footer className="flex flex-col items-center pb-3 pt-7 sm:pt-5 @5xl:pt-10 short:fixed short:bottom-4 short:left-[max(1rem,env(safe-area-inset-left))] short:z-40 short:p-0">
    <div className="relative flex h-[84px] w-[84px] items-center justify-center @5xl:h-[112px] @5xl:w-[112px]">
      <span className="absolute -inset-3 rounded-full bg-red-500/15 dark:bg-red-500/20" aria-hidden />
      <span className="absolute inset-0 rounded-full bg-red-500/40 motion-safe:animate-pulse-ring" aria-hidden />
      <span className="absolute inset-0 rounded-full bg-red-500/30 motion-safe:animate-pulse-ring [animation-delay:1.1s]" aria-hidden />
      <button
        type="button"
        onClick={onPress}
        aria-label="Enviar alerta de emergencia SOS"
        className="relative flex h-[84px] w-[84px] @5xl:h-[112px] @5xl:w-[112px] flex-col items-center justify-center gap-1 rounded-full border-4 border-red-200 bg-gradient-to-b from-red-500 to-red-700 text-white shadow-[0_0_30px_rgba(239,68,68,0.55)] transition-transform hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-300 active:scale-90"
      >
        <CircleAlert className="h-7 w-7 @5xl:h-9 @5xl:w-9 fill-white text-red-600" strokeWidth={2.5} aria-hidden />
        <span className="text-[11px] font-black leading-none tracking-wider @5xl:text-sm">SOS</span>
      </button>
    </div>
    <p className="mt-5 text-xs font-extrabold tracking-[0.2em] @5xl:mt-7 @5xl:text-sm short:hidden text-red-600 dark:text-red-400">PRESIONA PARA EMERGENCIA</p>
  </footer>
)

export default SOSFooter
