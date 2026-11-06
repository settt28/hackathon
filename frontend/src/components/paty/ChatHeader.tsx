import { ArrowLeft, BadgeCheck, Sun } from 'lucide-react'

interface ChatHeaderProps {
  onBack: () => void
}

/** Cabecera estilo app de mensajería: volver, avatar con anillo y nombre verificado. */
export default function ChatHeader({ onBack }: ChatHeaderProps) {
  return (
    <header className="flex items-center gap-2 border-b border-white/5 bg-[#0a1428] px-3 pb-3 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <button
        type="button"
        onClick={onBack}
        aria-label="Volver"
        className="flex h-11 w-11 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
      >
        <ArrowLeft className="h-6 w-6" strokeWidth={2.25} />
      </button>

      {/* Avatar: anillo degradado dorado → azul con el sol al centro */}
      <div className="ml-1 rounded-full bg-gradient-to-tr from-yellow-400 via-yellow-500 to-sky-400 p-[2px]">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0d1a33]">
          <Sun className="h-5 w-5 text-yellow-400" strokeWidth={2} aria-hidden />
        </div>
      </div>

      <h1 className="ml-2 flex items-center gap-1.5 text-xl font-bold text-white">
        Paty
        <BadgeCheck className="h-6 w-6 fill-yellow-400 text-[#0a1428]" strokeWidth={2.25} aria-label="Cuenta oficial verificada" />
      </h1>
    </header>
  )
}
