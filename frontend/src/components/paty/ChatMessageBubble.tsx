import { memo, useState } from 'react'
import { MapPin, Phone, Sparkles, Square, TriangleAlert, Volume2, WifiOff } from 'lucide-react'
import type { ChatMessage } from '../../hooks/usePatyChat'
import { speak, stopSpeaking } from '../../lib/speech'
import { safeUrl } from '../../lib/url'

/** Lee la respuesta en voz alta (Fish Audio en el servidor o la voz del navegador, sin internet). */
/** Mismo redondeo que usa Paty en su respuesta: toFixed(1) daría "0.1" para 0.15 y las dos cifras no cuadrarían. */
const oneDecimalKm = (km: number) => (Math.round(km * 10) / 10).toFixed(1)

function SpeakButton({ text }: { text: string }) {
  const [speaking, setSpeaking] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        if (speaking) {
          stopSpeaking()
          setSpeaking(false)
        } else {
          setSpeaking(true)
          void speak(text, () => setSpeaking(false))
        }
      }}
      aria-label={speaking ? 'Detener lectura' : 'Escuchar respuesta'}
      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-sky-700 transition-colors hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-cyan-400/25 dark:text-cyan-300 dark:hover:bg-cyan-400/10"
    >
      {speaking ? <Square className="h-3 w-3 fill-current" aria-hidden /> : <Volume2 className="h-3.5 w-3.5" aria-hidden />}
      {speaking ? 'Detener' : 'Escuchar'}
    </button>
  )
}

/**
 * Burbuja de un mensaje. Las de Paty muestran además llamadas de emergencia, avisos, postas y fuentes.
 * Memorizada: escribir en el campo de texto no vuelve a dibujar toda la conversación.
 */
export default memo(function ChatMessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <li className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-sky-600 px-4 py-2.5 text-[15px] text-white dark:bg-cyan-400 dark:text-[#070d17]">
        {message.text}
      </li>
    )
  }

  const d = message.data
  const grave = d?.triage.level === 'Grave'
  const calls = d?.actions.filter((a) => a.type === 'llamar' && a.value) ?? []
  const warnings = [...new Set([...(d?.officialNotices ?? []), ...(d?.zoneWarnings ?? [])])]
  // Varios consejos suelen citar el mismo documento: una fuente por URL
  const sources = [...new Map((d?.tips ?? []).map((t) => [t.sourceUrl, t])).values()]

  return (
    <li
      className={`mr-auto max-w-[90%] space-y-3 rounded-2xl rounded-bl-md border px-4 py-3 text-[15px] ${
        message.error
          ? 'border-red-300 bg-red-50 text-red-800 dark:border-red-400/40 dark:bg-red-950/40 dark:text-red-100'
          : grave
            ? 'border-red-300 bg-red-50 text-slate-900 dark:border-red-500/60 dark:bg-[#2a1220] dark:text-white'
            : 'border-slate-200 bg-white text-slate-900 dark:border-cyan-400/15 dark:bg-[#0b1a26] dark:text-white'
      }`}
    >
      <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>

      {!message.error && (
        <div className="flex items-center gap-2">
          <SpeakButton text={message.text} />
          {d?.usedAi && (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400" title="Redactado por el modelo de lenguaje con fuentes oficiales">
              <Sparkles className="h-3 w-3" aria-hidden />
              IA
            </span>
          )}
          {d?.offline && (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400" title="Respondido en tu teléfono con los consejos oficiales guardados">
              <WifiOff className="h-3 w-3" aria-hidden />
              Modo sin conexión
            </span>
          )}
        </div>
      )}

      {/* Llamadas: lo primero visible en una emergencia */}
      {calls.length > 0 && (
        <div className="flex flex-col gap-2">
          {calls.map((a) => (
            <a
              key={a.value}
              href={`tel:${a.value!.replace(/[^\d+]/g, '')}`}
              className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-semibold text-white hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Phone className="h-5 w-5" aria-hidden />
              {a.label}
            </a>
          ))}
        </div>
      )}

      {/* Boletines e historial: plegados, para que la respuesta se lea de un vistazo (se abren si la persona quiere) */}
      {warnings.length > 0 && (
        <details className="group text-sm">
          <summary className="flex cursor-pointer list-none items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-300">
            <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden />
            Ver datos oficiales ({warnings.length})
            <span className="text-xs transition-transform group-open:rotate-180" aria-hidden>
              ▾
            </span>
          </summary>
          <ul className="mt-2 space-y-1.5 text-amber-800 dark:text-amber-200">
            {warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </details>
      )}

      {d && d.nearestCenters.length > 0 && (
        <ul className="space-y-1.5 text-sm">
          {d.nearestCenters.slice(0, 3).map((c) => (
            <li key={`${c.center.latitude},${c.center.longitude}`}>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${c.center.latitude},${c.center.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="flex gap-2 text-sky-700 hover:underline dark:text-sky-300"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {c.center.name} · {oneDecimalKm(c.distanceKm)} km (~{c.walkingMinutes} min a pie)
              </a>
            </li>
          ))}
        </ul>
      )}

      {sources.length > 0 && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Fuente:{' '}
          {sources.map((t, i) => (
            <span key={t.sourceUrl}>
              {i > 0 && ' · '}
              {safeUrl(t.sourceUrl) ? (
                <a href={safeUrl(t.sourceUrl)} target="_blank" rel="noreferrer" className="underline hover:text-slate-800 dark:hover:text-slate-200">
                  {t.source}
                </a>
              ) : (
                t.source
              )}
            </span>
          ))}
        </p>
      )}
    </li>
  )
})
