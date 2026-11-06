import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ChatHeader from '../components/paty/ChatHeader'
import ChatInputBar from '../components/paty/ChatInputBar'
import ChatMessageBubble from '../components/paty/ChatMessageBubble'
import PatyHero from '../components/paty/PatyHero'
import SuggestionList from '../components/paty/SuggestionList'
import { SUGGESTIONS } from '../components/paty/suggestions'
import { usePatyChat } from '../hooks/usePatyChat'
import { getGreeting } from '../lib/greeting'

interface PatyChatViewProps {
  /** Nombre del usuario cuando exista autenticación; sin él, el saludo es genérico. */
  userName?: string
}

/**
 * Vista completa del chatbot Paty.
 * Sin mensajes: pantalla de bienvenida con sugerencias. Con mensajes: la conversación.
 * Usa 100dvh para ocupar toda la altura real en móviles (evita el salto de la barra del navegador).
 */
export default function PatyChatView({ userName }: PatyChatViewProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { messages, sending, send } = usePatyChat()
  const [draft, setDraft] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length, sending])

  const submit = (text: string) => {
    setDraft('')
    void send(text)
  }

  // Si se entró directo a /paty no hay historial al que volver: ir al inicio
  const goBack = () => (location.key === 'default' ? navigate('/') : navigate(-1))

  return (
    <div className="h-[100dvh] bg-[#081122] font-[Roboto,Arial,Helvetica,sans-serif] antialiased">
      {/* En desktop se centra como una app móvil; en móvil ocupa todo el ancho */}
      <div className="mx-auto flex h-full max-w-md flex-col overflow-hidden bg-[#0b1730] md:border-x md:border-white/5">
        <ChatHeader onBack={goBack} />

        <main className="relative flex-1 overflow-y-auto bg-[radial-gradient(rgba(148,163,184,0.09)_1px,transparent_1px)] bg-[length:22px_22px]">
          {messages.length === 0 ? (
            <>
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_50%_40%,rgba(250,204,21,0.08),transparent_60%)]"
                aria-hidden
              />
              <div className="relative pb-6">
                <PatyHero greeting={getGreeting()} userName={userName} />
                <SuggestionList items={SUGGESTIONS} onSelect={(s) => submit(s.text)} />
                <p className="mt-10 px-4 text-center text-xs tracking-wide text-slate-400">
                  Respaldado por datos de observación del Perú • Senamhi
                </p>
              </div>
            </>
          ) : (
            <ol className="flex flex-col gap-3 px-3 py-4" aria-live="polite" aria-busy={sending}>
              {messages.map((m) => (
                <ChatMessageBubble key={m.id} message={m} />
              ))}
              {sending && (
                <li className="mr-auto rounded-2xl rounded-bl-md bg-[#11234a] px-4 py-3 text-sm text-slate-300">
                  Paty está escribiendo…
                </li>
              )}
            </ol>
          )}
          <div ref={endRef} />
        </main>

        <ChatInputBar value={draft} onChange={setDraft} onSubmit={submit} disabled={sending} />
      </div>
    </div>
  )
}
