import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ChatIcon, CloseIcon, SendIcon } from './Icons'

type Message = { id: number; from: 'paty' | 'user'; text: string }

const WELCOME: Message = {
  id: 0,
  from: 'paty',
  text: '¡Hola! Soy Paty 👋 Puedo orientarte sobre salud, agro y emergencias durante El Niño.',
}

/**
 * Respuesta local provisional. Reemplazar por una llamada al backend / servicio de IA.
 */
function mockReply(input: string): string {
  const t = input.toLowerCase()
  if (t.includes('dengue') || t.includes('salud')) return 'Elimina agua estancada y usa repelente. Revisa el módulo Salud para más detalles.'
  if (t.includes('cultivo') || t.includes('agro')) return 'Revisa el módulo Agro para recomendaciones de siembra y drenaje.'
  if (t.includes('emergencia') || t.includes('huaico') || t.includes('lluvia')) return 'Ante una emergencia llama al 115 o 116. Ubica tu zona segura más cercana.'
  return 'Gracias por tu mensaje. Pronto podré darte información más detallada.'
}

/**
 * Chatbot flotante persistente. Se monta en MainLayout, así que conserva la conversación
 * al cambiar de pantalla. En móvil se ubica sobre la Bottom Bar; en desktop en `bottom-4 right-4`.
 */
export default function PatyChatbot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([WELCOME])
  const [draft, setDraft] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  // Auto-scroll al último mensaje
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, open])

  const send = (e: FormEvent) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text) return
    setDraft('')
    setMessages((m) => [...m, { id: Date.now(), from: 'user', text }])
    // Simula latencia de respuesta
    setTimeout(() => {
      setMessages((m) => [...m, { id: Date.now() + 1, from: 'paty', text: mockReply(text) }])
    }, 500)
  }

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-3 md:bottom-4">
      {open && (
        <section
          aria-label="Chat con Paty"
          className="flex h-[70vh] max-h-[32rem] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl sm:w-96"
        >
          <header className="flex items-center justify-between bg-sky-600 px-4 py-3 text-white">
            <div>
              <p className="font-semibold">Paty</p>
              <p className="text-xs text-sky-100">Asistente preventivo</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar chat" className="rounded-full p-1 hover:bg-sky-500">
              <CloseIcon className="h-5 w-5" />
            </button>
          </header>

          <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto bg-slate-50 p-4">
            {messages.map((m) => (
              <p
                key={m.id}
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  m.from === 'user' ? 'ml-auto bg-sky-600 text-white' : 'bg-white text-slate-700 shadow-sm'
                }`}
              >
                {m.text}
              </p>
            ))}
          </div>

          <form onSubmit={send} className="flex gap-2 border-t border-slate-200 p-3">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Escribe tu consulta…"
              className="min-w-0 flex-1 rounded-full border border-slate-300 px-4 py-2 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-200"
            />
            <button type="submit" aria-label="Enviar" className="rounded-full bg-sky-600 p-2.5 text-white hover:bg-sky-700 disabled:opacity-50" disabled={!draft.trim()}>
              <SendIcon />
            </button>
          </form>
        </section>
      )}

      {/* Botón flotante (FAB) */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Cerrar chat con Paty' : 'Abrir chat con Paty'}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-600 text-white shadow-lg transition-transform hover:scale-105 hover:bg-sky-700"
      >
        {open ? <CloseIcon /> : <ChatIcon />}
      </button>
    </div>
  )
}
