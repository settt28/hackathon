import { useState } from 'react'
import { Camera, Mic, Paperclip, Smile } from 'lucide-react'

interface ChatInputBarProps {
  value: string
  onChange: (value: string) => void
}

const inlineIconButton =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400'

/** Barra inferior: campo de texto tipo píldora con acciones + botón de micrófono dorado. */
export default function ChatInputBar({ value, onChange }: ChatInputBarProps) {
  // Estado visual de "grabando" (solo UI, sin captura de audio)
  const [recording, setRecording] = useState(false)

  return (
    <div className="flex items-center gap-2.5 border-t border-white/5 bg-[#0a1428] px-2.5 py-3">
      <div className="flex min-w-0 flex-1 items-center gap-1 rounded-full border border-[#22396a] bg-[#11234a] px-2 py-1.5 transition-colors focus-within:border-yellow-400/70 focus-within:ring-2 focus-within:ring-yellow-400/20">
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
          className="min-w-0 flex-1 bg-transparent px-1 text-base text-white placeholder:text-slate-400 focus:outline-none"
        />
        <button type="button" aria-label="Adjuntar archivo" className={inlineIconButton}>
          <Paperclip className="h-5 w-5" />
        </button>
        <button type="button" aria-label="Tomar foto" className={inlineIconButton}>
          <Camera className="h-5 w-5" />
        </button>
      </div>

      {/* Micrófono: amarillo de alto contraste; se encoge al presionar y pulsa mientras "graba" */}
      <button
        type="button"
        onClick={() => setRecording((r) => !r)}
        aria-label={recording ? 'Detener grabación de voz' : 'Grabar mensaje de voz'}
        aria-pressed={recording}
        className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-yellow-400 to-amber-500 text-[#0a1428] shadow-lg shadow-yellow-500/20 transition-transform hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-90 ${
          recording ? 'ring-4 ring-yellow-400/40' : ''
        }`}
      >
        {recording && <span className="absolute inset-0 animate-ping rounded-full bg-yellow-400/40" aria-hidden />}
        <Mic className="relative h-6 w-6" strokeWidth={2.25} />
      </button>
    </div>
  )
}
