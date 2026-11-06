import type { FC } from 'react'
import { CircleAlert } from 'lucide-react'

interface SOSFooterProps {
  onPress?: () => void
}

/** Botón de emergencia SOS con ondas rojas continuas para que sea lo más visible de la pantalla. */
const SOSFooter: FC<SOSFooterProps> = ({ onPress }) => (
  <footer className="flex flex-col items-center pb-3 pt-5">
    <div className="relative flex h-16 w-16 items-center justify-center">
      <span className="absolute inset-0 rounded-full bg-red-500/40 motion-safe:animate-pulse-ring" aria-hidden />
      <span className="absolute inset-0 rounded-full bg-red-500/30 motion-safe:animate-pulse-ring [animation-delay:1.1s]" aria-hidden />
      <button
        type="button"
        onClick={onPress}
        aria-label="Enviar alerta de emergencia SOS"
        className="relative flex h-16 w-16 flex-col items-center justify-center rounded-full border-4 border-white bg-gradient-to-b from-red-500 to-red-700 text-white shadow-[0_0_30px_rgba(239,68,68,0.55)] transition-transform hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-300 active:scale-90"
      >
        <CircleAlert className="h-6 w-6 fill-white text-red-600" strokeWidth={2.5} aria-hidden />
        <span className="text-[9px] font-black leading-none tracking-wider">SOS</span>
      </button>
    </div>
    <p className="mt-3 text-[11px] font-extrabold tracking-[0.14em] text-red-600 dark:text-red-500">PRESIONA PARA EMERGENCIA</p>
  </footer>
)

export default SOSFooter
