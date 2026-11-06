import type { Ref } from 'react'
import { Mic, SendHorizontal, Square } from 'lucide-react'
import clsx from 'clsx'
import { useRecorder } from '../../hooks/useRecorder'

interface ChatInputBarProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (value: string) => void
  /** Si se pasa, con el campo vacío el botón pasa a ser micrófono (mensaje de voz). */
  onVoice?: (audio: Blob) => void
  disabled?: boolean
  inputRef?: Ref<HTMLInputElement>
}

const actionButton =
  'flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-transform focus-visible:outline-none focus-visible:ring-2 active:scale-90 disabled:opacity-40 disabled:active:scale-100'

/**
 * Barra inferior: campo de texto tipo píldora + botón de acción. Enter envía.
 * Como en las apps de mensajería: con texto, el botón envía; vacío, graba un mensaje de voz.
 */
export default function ChatInputBar({ value, onChange, onSubmit, onVoice, disabled, inputRef }: ChatInputBarProps) {
  const recorder = useRecorder((audio) => onVoice?.(audio))
  const canSend = !disabled && value.trim().length > 0
  const showMic = !!onVoice && recorder.supported && value.trim().length === 0

  return (
    <div className="border-t border-slate-200 bg-white dark:border-cyan-400/15 dark:bg-[#070d17]">
      {recorder.error && <p className="px-4 pt-2 text-xs text-red-600 dark:text-red-400" role="alert">{recorder.error}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (canSend) onSubmit(value)
        }}
        className="flex items-center gap-2.5 px-2.5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <label htmlFor="paty-input" className="sr-only">
          Mensaje a Paty
        </label>
        <input
          id="paty-input"
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={recorder.recording ? 'Escuchando… toca ■ para enviar' : 'Mensaje a Paty...'}
          readOnly={recorder.recording}
          autoComplete="off"
          maxLength={1000}
          enterKeyHint="send"
          className="min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 transition-colors placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20 dark:border-cyan-400/20 dark:bg-[#0b1a26] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-cyan-400/60 dark:focus:ring-cyan-400/20"
        />
        {showMic || recorder.recording ? (
          <button
            type="button"
            onClick={recorder.recording ? recorder.stop : recorder.start}
            disabled={disabled && !recorder.recording}
            aria-label={recorder.recording ? 'Detener y enviar mensaje de voz' : 'Grabar mensaje de voz'}
            aria-pressed={recorder.recording}
            className={clsx(
              actionButton,
              'relative',
              recorder.recording
                ? 'bg-red-600 text-white shadow-[0_0_24px_rgba(239,68,68,0.45)] focus-visible:ring-red-300'
                : 'bg-gradient-to-r from-sky-700 to-blue-600 text-white shadow-[0_8px_24px_rgba(2,132,199,0.3)] focus-visible:ring-sky-300 dark:from-cyan-400 dark:to-cyan-500 dark:text-[#070d17] dark:shadow-[0_0_24px_rgba(34,211,238,0.35)]',
            )}
          >
            {recorder.recording && <span className="absolute inset-0 rounded-full bg-red-500/50 motion-safe:animate-ping" aria-hidden />}
            {recorder.recording ? <Square className="relative h-5 w-5 fill-white" /> : <Mic className="h-6 w-6" strokeWidth={2.25} />}
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Enviar mensaje"
            className={clsx(
              actionButton,
              'bg-gradient-to-r from-sky-700 to-blue-600 text-white shadow-[0_8px_24px_rgba(2,132,199,0.3)] hover:brightness-105 focus-visible:ring-sky-300 dark:from-cyan-400 dark:to-cyan-500 dark:text-[#070d17] dark:shadow-[0_0_24px_rgba(34,211,238,0.35)] dark:focus-visible:ring-white',
            )}
          >
            <SendHorizontal className="h-6 w-6" strokeWidth={2.25} />
          </button>
        )}
      </form>
    </div>
  )
}
