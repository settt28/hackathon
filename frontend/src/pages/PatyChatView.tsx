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
 * El tema (claro/oscuro) es global y se cambia desde el dashboard.
 */
export default function PatyChatView({ userName = 'Clever_rq' }: PatyChatViewProps) {
  const navigate = useNavigate()
  const greeting = useGreeting()
  const [draft, setDraft] = useState('')

  return (
    <div className="h-[100dvh] bg-slate-200 antialiased dark:bg-[#1f1f22]">
      {/* En desktop se centra como una app móvil; en móvil ocupa todo el ancho. Fondos iguales al dashboard */}
      <div className="mx-auto flex h-full max-w-md flex-col overflow-hidden bg-[#f4f7fb] md:border-x md:border-slate-200 dark:bg-[#070d17] dark:md:border-cyan-400/15">
        <ChatHeader onBack={() => navigate(-1)} />

        {/* Textura sutil de puntos + resplandor cian superior (como el dashboard) */}
        <main className="relative flex-1 overflow-y-auto bg-[radial-gradient(rgba(14,165,233,0.12)_1px,transparent_1px)] bg-[length:22px_22px] dark:bg-[radial-gradient(rgba(34,211,238,0.07)_1px,transparent_1px)]">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_50%_0%,rgba(14,165,233,0.12),transparent_60%)] dark:bg-[radial-gradient(ellipse_at_50%_0%,rgba(34,211,238,0.1),transparent_60%)]"
            aria-hidden
          />
          <div className="relative pb-6">
            <PatyHero greeting={greeting} userName={userName} />
            {/* Al tocar una sugerencia se coloca en el campo de texto */}
            <SuggestionList items={SUGGESTIONS} onSelect={(s) => setDraft(s.text)} />
            <p className="mt-10 px-4 text-center text-xs tracking-wide text-slate-500 dark:text-cyan-200/50">
              Respaldado por datos de observación del Perú • Senamhi
            </p>
          </div>
        </main>

        <ChatInputBar value={draft} onChange={setDraft} />
      </div>
    </div>
  )
}
