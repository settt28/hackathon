import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import ChatHeader from '../components/paty/ChatHeader'
import OfflineBanner from '../components/OfflineBanner'
import ChatInputBar from '../components/paty/ChatInputBar'
import CallOverlay from '../components/paty/CallOverlay'
import ChatMessageBubble from '../components/paty/ChatMessageBubble'
import MedicalAlert from '../components/paty/MedicalAlert'
import PatyHero from '../components/paty/PatyHero'
import SuggestionList from '../components/paty/SuggestionList'
import { SUGGESTIONS } from '../components/paty/suggestions'
import { usePatyCall } from '../hooks/usePatyCall'
import { usePatyChat } from '../hooks/usePatyChat'
import { getCapacidades } from '../lib/api'
import { getGreeting } from '../lib/greeting'

// Medida inmediata en emergencia médica (la misma que da el backend): solo acciones seguras, sin medicamentos
const FIRST_MEASURE =
  'No dejes sola a la persona, mantenla en un lugar seguro y ventilado, y no le des medicamentos, comida ni bebida si está somnolienta o inconsciente.'

type HealthAlert = { id: string; number: string; measure: string; urgent: boolean }

interface PatyChatViewProps {
  /** Nombre del usuario cuando exista autenticación; sin él, el saludo es genérico. */
  userName?: string
}

/**
 * Vista completa del chatbot Paty.
 * Sin mensajes: pantalla de bienvenida con sugerencias. Con mensajes: la conversación.
 * Usa 100dvh para ocupar toda la altura real en móviles (evita el salto de la barra del navegador).
 * El tema (claro/oscuro) es global y se cambia desde el dashboard.
 */
export default function PatyChatView({ userName }: PatyChatViewProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { messages, sending, send, sendVoice } = usePatyChat()
  const [canDictate, setCanDictate] = useState(false)
  const [draft, setDraft] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  // Respuesta de salud (moderada o grave): alerta flotante con el SAMU hasta que la persona la cierre
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set())
  const last = messages.at(-1)
  const healthAlert: HealthAlert | null = (() => {
    if (last?.role !== 'paty' || !last.data || dismissed.has(last.id)) return null
    const { triage, tips } = last.data
    if (triage.emergencyType !== 'Medica' || triage.level === 'Leve') return null
    const urgent = triage.level === 'Grave'
    return {
      id: last.id,
      number: triage.phoneNumber ?? '106',
      measure: urgent ? FIRST_MEASURE : (tips[0]?.steps[0] ?? 'Vigila los síntomas y acude a tu centro de salud.'),
      urgent,
    }
  })()

  // Llamada por voz: el navegador reconoce la voz; si no puede, se graba y transcribe en el servidor (Whisper)
  const call = usePatyCall({ ask: send, askAudio: (audio) => sendVoice(audio, false), serverCanListen: canDictate })
  const startCall = call.start

  // Desde el dashboard ("Habla con Paty" → micrófono) se llega con la llamada ya iniciada
  const wantsCall = (location.state as { call?: boolean } | null)?.call === true
  useEffect(() => {
    if (wantsCall) void startCall()
  }, [wantsCall, startCall])

  // ¿El servidor puede transcribir audio? (respaldo para navegadores sin reconocimiento de voz)
  useEffect(() => {
    let active = true
    void getCapacidades().then((c) => active && setCanDictate(c.dictado))
    return () => {
      active = false
    }
  }, [])

  // Baja hasta el último mensaje (sin mensajes no: la bienvenida debe verse desde arriba)
  useEffect(() => {
    if (messages.length > 0) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages.length, sending])

  const submit = (text: string) => {
    setDraft('')
    void send(text)
  }

  // Si se entró directo a /paty no hay historial al que volver: ir al inicio
  const goBack = () => (location.key === 'default' ? navigate('/') : navigate(-1))

  return (
    <div className="h-[100dvh] bg-slate-200 antialiased dark:bg-[#1f1f22]">
      {/* En desktop se centra como una app móvil; en móvil ocupa todo el ancho. Fondos iguales al dashboard */}
      <div className="relative mx-auto flex h-full max-w-md flex-col overflow-hidden bg-[#f4f7fb] md:border-x md:border-slate-200 dark:bg-[#070d17] dark:md:border-cyan-400/15">
        <OfflineBanner />
        <ChatHeader onBack={goBack} />

        {/* Textura sutil de puntos (como el dashboard) */}
        <main className="relative flex-1 overflow-y-auto bg-[radial-gradient(rgba(14,165,233,0.12)_1px,transparent_1px)] bg-[length:22px_22px] dark:bg-[radial-gradient(rgba(34,211,238,0.07)_1px,transparent_1px)]">
          {messages.length === 0 ? (
            <>
              <div
                className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_at_50%_0%,rgba(14,165,233,0.12),transparent_60%)] dark:bg-[radial-gradient(ellipse_at_50%_0%,rgba(34,211,238,0.1),transparent_60%)]"
                aria-hidden
              />
              <div className="relative pb-6">
                <PatyHero greeting={getGreeting()} userName={userName} />
                <SuggestionList
                  items={SUGGESTIONS}
                  onSelect={(s) => (s.prompt ? submit(s.prompt) : inputRef.current?.focus())}
                />
                <p className="mt-10 px-4 text-center text-xs tracking-wide text-slate-500 dark:text-cyan-200/50">
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
                <li className="mr-auto rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500 dark:border-cyan-400/15 dark:bg-[#0b1a26] dark:text-slate-300">
                  Paty está escribiendo…
                </li>
              )}
            </ol>
          )}
          <div ref={endRef} />
        </main>

        {healthAlert && (
          <MedicalAlert
            key={healthAlert.id}
            number={healthAlert.number}
            measure={healthAlert.measure}
            urgent={healthAlert.urgent}
            onClose={() => setDismissed((d) => new Set(d).add(healthAlert.id))}
          />
        )}

        {call.state !== 'idle' && (
          <CallOverlay state={call.state} heard={call.heard} said={call.said} error={call.error} onHangUp={call.hangUp} onClose={call.close} />
        )}

        <ChatInputBar
          value={draft}
          onChange={setDraft}
          onSubmit={submit}
          onCall={() => void startCall()}
          disabled={sending}
          inputRef={inputRef}
        />
      </div>
    </div>
  )
}
