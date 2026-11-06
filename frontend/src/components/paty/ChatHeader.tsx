import type { FC } from 'react'
import { ArrowLeft, BadgeCheck } from 'lucide-react'
import PatyLogo from './PatyLogo'

interface ChatHeaderProps {
  onBack: () => void
}

/** Cabecera estilo app de mensajería: volver, avatar con el logo de Paty y nombre verificado. */
const ChatHeader: FC<ChatHeaderProps> = ({ onBack }) => (
  <header className="border-b border-slate-200 bg-white px-3 pb-3 pt-4 dark:border-cyan-400/15 dark:bg-[#070d17] @3xl:px-6 @3xl:pt-4">
    {/* En pantallas anchas el contenido se alinea con la columna de la conversación */}
    <div className="mx-auto flex max-w-3xl items-center gap-2">
      <button
        type="button"
        onClick={onBack}
        aria-label="Volver"
        className="flex h-11 w-11 items-center justify-center rounded-full text-slate-700 transition-colors hover:bg-sky-50 hover:text-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:text-slate-200 dark:hover:bg-cyan-400/10 dark:hover:text-cyan-300 dark:focus-visible:ring-cyan-400"
      >
        <ArrowLeft className="h-6 w-6" strokeWidth={2.25} />
      </button>

      {/* Avatar: mismo estilo que el escudo de la cabecera del dashboard */}
      <div className="ml-1 flex h-12 w-12 items-center justify-center rounded-full border border-sky-200 bg-white shadow-[0_4px_14px_rgba(14,165,233,0.18)] dark:border-cyan-400/40 dark:bg-[#0e2230] dark:shadow-[0_0_18px_rgba(34,211,238,0.25)]">
        <PatyLogo className="h-9 w-9" iconClassName="h-2.5 w-2.5" glow={false} />
      </div>

      <h1 className="ml-2 flex items-center gap-1.5 text-xl font-bold text-slate-900 dark:text-white">
        Paty
        {/* Check dorado de cuenta oficial (mismo ámbar que la etiqueta "Oficial" del dashboard) */}
        <BadgeCheck className="h-6 w-6 fill-amber-400 text-white dark:text-[#070d17]" strokeWidth={2.25} aria-label="Cuenta oficial verificada" />
      </h1>
    </div>
  </header>
)

export default ChatHeader
