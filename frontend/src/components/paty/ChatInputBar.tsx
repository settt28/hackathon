import { useState } from 'react'
import { Camera, Mic, Paperclip, Smile } from 'lucide-react'
import clsx from 'clsx'

interface ChatInputBarProps {
  value: string
  onChange: (value: string) => void
}

const inlineIconButton =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-sky-50 hover:text-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:text-slate-300 dark:hover:bg-cyan-400/10 dark:hover:text-cyan-300 dark:focus-visible:ring-cyan-400'

/**
 * Barra inferior: campo de texto tipo píldora con acciones + botón de micrófono.
 * El micrófono usa el color de acción principal del dashboard: azul en modo claro, cian en oscuro.
 */
export default function ChatInputBar({ value, onChange }: ChatInputBarProps) {
  // Estado visual de "grabando" (solo UI, sin captura de audio)
  const [recording, setRecording] = useState(false)

  return (
    <div className="flex items-center gap-2.5 border-t border-slate-200 bg-white px-2.5 py-3 dark:border-cyan-400/15 dark:bg-[#070d17]">
      <div className="flex min-w-0 flex-1 items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1.5 transition-colors focus-within:border-sky-400 focus-within:ring-2 focus-within:ring-sky-400/20 dark:border-cyan-400/20 dark:bg-[#0b1a26] dark:focus-within:border-cyan-400/60 dark:focus-within:ring-cyan-400/20">
        <button type="button" aria-label="Insertar emoji" className={inlineIconButton}>
          <Smile className="h-6 w-6" />
        </button>
        <label htmlFor="paty-input" className="sr-only">
          Mensaje a Paty
        </label>
        <input
          id="paty-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Mensaje a Paty..."
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent px-1 text-base text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white dark:placeholder:text-slate-500"
        />
        <button type="button" aria-label="Adjuntar archivo" className={inlineIconButton}>
          <Paperclip className="h-5 w-5" />
        </button>
        <button type="button" aria-label="Tomar foto" className={inlineIconButton}>
          <Camera className="h-5 w-5" />
        </button>
      </div>

      {/* Micrófono: se encoge al presionar y pulsa mientras "graba" */}
      <button
        type="button"
        onClick={() => setRecording((r) => !r)}
        aria-label={recording ? 'Detener grabación de voz' : 'Grabar mensaje de voz'}
        aria-pressed={recording}
        className={clsx(
          'relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-sky-700 to-blue-600 text-white shadow-[0_8px_24px_rgba(2,132,199,0.3)] transition-transform hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 active:scale-90 dark:from-cyan-400 dark:to-cyan-500 dark:text-[#070d17] dark:shadow-[0_0_24px_rgba(34,211,238,0.35)] dark:focus-visible:ring-white',
          recording && 'ring-4 ring-sky-400/40 dark:ring-cyan-400/40',
        )}
      >
        {recording && <span className="absolute inset-0 animate-ping rounded-full bg-sky-400/40 dark:bg-cyan-400/40" aria-hidden />}
        <Mic className="relative h-6 w-6" strokeWidth={2.25} />
      </button>
    </div>
  )
}
