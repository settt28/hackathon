import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ChatHeader from '../components/paty/ChatHeader'
import ChatInputBar from '../components/paty/ChatInputBar'
import PatyHero from '../components/paty/PatyHero'
import SuggestionList from '../components/paty/SuggestionList'
import { SUGGESTIONS } from '../components/paty/suggestions'
import { useGreeting } from '../hooks/useGreeting'

interface PatyChatViewProps {
  userName?: string
}

/**
 * Vista completa del chatbot Paty (pantalla de bienvenida).
 * Estructura: cabecera fija · contenido desplazable · barra de entrada fija.
 * Usa 100dvh para ocupar toda la altura real en móviles (evita el salto de la barra del navegador).
 */
export default function PatyChatView({ userName = 'Clever_rq' }: PatyChatViewProps) {
  const navigate = useNavigate()
  const greeting = useGreeting()
  const [draft, setDraft] = useState('')

  return (
    <div className="h-[100dvh] bg-[#081122] font-[Roboto,Arial,Helvetica,sans-serif] antialiased">
      {/* En desktop se centra como una app móvil; en móvil ocupa todo el ancho */}
      <div className="mx-auto flex h-full max-w-md flex-col overflow-hidden bg-[#0b1730] md:border-x md:border-white/5">
        <ChatHeader onBack={() => navigate(-1)} />

        {/* Fondo con textura sutil de puntos + resplandor detrás del logo */}
        <main className="relative flex-1 overflow-y-auto bg-[radial-gradient(rgba(148,163,184,0.09)_1px,transparent_1px)] bg-[length:22px_22px]">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_50%_40%,rgba(250,204,21,0.08),transparent_60%)]"
            aria-hidden
          />
          <div className="relative pb-6">
            <PatyHero greeting={greeting} userName={userName} />
            {/* Al tocar una sugerencia se coloca en el campo de texto */}
            <SuggestionList items={SUGGESTIONS} onSelect={(s) => setDraft(s.text)} />
            <p className="mt-10 px-4 text-center text-xs tracking-wide text-slate-400">
              Respaldado por datos de observación del Perú • Senamhi
            </p>
          </div>
        </main>

        <ChatInputBar value={draft} onChange={setDraft} />
      </div>
    </div>
  )
}
