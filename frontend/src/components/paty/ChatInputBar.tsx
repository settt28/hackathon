import type { Ref } from 'react'
import { SendHorizontal } from 'lucide-react'

interface ChatInputBarProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (value: string) => void
  disabled?: boolean
  inputRef?: Ref<HTMLInputElement>
}

/**
 * Barra inferior: campo de texto tipo píldora + botón de enviar. Enter envía.
 * El botón usa el color de acción principal del dashboard: azul en modo claro, cian en oscuro.
 */
export default function ChatInputBar({ value, onChange, onSubmit, disabled, inputRef }: ChatInputBarProps) {
  const canSend = !disabled && value.trim().length > 0

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (canSend) onSubmit(value)
      }}
      className="flex items-center gap-2.5 border-t border-slate-200 bg-white px-2.5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] dark:border-cyan-400/15 dark:bg-[#070d17]"
    >
      <label htmlFor="paty-input" className="sr-only">
        Mensaje a Paty
      </label>
      <input
        id="paty-input"
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Mensaje a Paty..."
        autoComplete="off"
        maxLength={1000}
        enterKeyHint="send"
        className="min-w-0 flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 transition-colors placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20 dark:border-cyan-400/20 dark:bg-[#0b1a26] dark:text-white dark:placeholder:text-slate-500 dark:focus:border-cyan-400/60 dark:focus:ring-cyan-400/20"
      />
      <button
        type="submit"
        disabled={!canSend}
        aria-label="Enviar mensaje"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-sky-700 to-blue-600 text-white shadow-[0_8px_24px_rgba(2,132,199,0.3)] transition-transform hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 active:scale-90 disabled:opacity-40 disabled:active:scale-100 dark:from-cyan-400 dark:to-cyan-500 dark:text-[#070d17] dark:shadow-[0_0_24px_rgba(34,211,238,0.35)] dark:focus-visible:ring-white"
      >
        <SendHorizontal className="h-6 w-6" strokeWidth={2.25} />
      </button>
    </form>
  )
}
