import { SendHorizontal } from 'lucide-react'

interface ChatInputBarProps {
  value: string
  onChange: (value: string) => void
  onSubmit: (value: string) => void
  disabled?: boolean
}

/** Barra inferior: campo de texto tipo píldora + botón de enviar dorado. Enter envía. */
export default function ChatInputBar({ value, onChange, onSubmit, disabled }: ChatInputBarProps) {
  const canSend = !disabled && value.trim().length > 0

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (canSend) onSubmit(value)
      }}
      className="flex items-center gap-2.5 border-t border-white/5 bg-[#0a1428] px-2.5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <label htmlFor="paty-input" className="sr-only">
        Mensaje a Paty
      </label>
      <input
        id="paty-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Mensaje a Paty..."
        autoComplete="off"
        maxLength={1000}
        enterKeyHint="send"
        className="min-w-0 flex-1 rounded-full border border-[#22396a] bg-[#11234a] px-4 py-3 text-base text-white transition-colors placeholder:text-slate-400 focus:border-yellow-400/70 focus:outline-none focus:ring-2 focus:ring-yellow-400/20"
      />
      <button
        type="submit"
        disabled={!canSend}
        aria-label="Enviar mensaje"
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-yellow-400 to-amber-500 text-[#0a1428] shadow-lg shadow-yellow-500/20 transition-transform hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-90 disabled:opacity-40 disabled:active:scale-100"
      >
        <SendHorizontal className="h-6 w-6" strokeWidth={2.25} />
      </button>
    </form>
  )
}
