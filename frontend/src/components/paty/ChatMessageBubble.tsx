import { MapPin, Phone, TriangleAlert } from 'lucide-react'
import type { ChatMessage } from '../../hooks/usePatyChat'

/** Burbuja de un mensaje. Las de Paty muestran además llamadas de emergencia, avisos, postas y fuentes. */
export default function ChatMessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <li className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-yellow-400 px-4 py-2.5 text-[15px] text-[#0a1428]">
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
      className={`mr-auto max-w-[90%] space-y-3 rounded-2xl rounded-bl-md border px-4 py-3 text-[15px] text-white ${
        message.error ? 'border-red-400/40 bg-red-950/40' : grave ? 'border-red-500/60 bg-[#2a1220]' : 'border-[#1e3460] bg-[#11234a]'
      }`}
    >
      <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>

      {/* Llamadas: lo primero visible en una emergencia */}
      {calls.length > 0 && (
        <div className="flex flex-col gap-2">
          {calls.map((a) => (
            <a
              key={a.value}
              href={`tel:${a.value}`}
              className="flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 font-semibold text-white hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Phone className="h-5 w-5" aria-hidden />
              {a.label}
            </a>
          ))}
        </div>
      )}

      {warnings.length > 0 && (
        <ul className="space-y-1.5 text-sm text-amber-200">
          {warnings.map((w) => (
            <li key={w} className="flex gap-2">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              {w}
            </li>
          ))}
        </ul>
      )}

      {d && d.nearestCenters.length > 0 && (
        <ul className="space-y-1.5 text-sm">
          {d.nearestCenters.slice(0, 3).map((c) => (
            <li key={`${c.center.latitude},${c.center.longitude}`}>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${c.center.latitude},${c.center.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="flex gap-2 text-sky-300 hover:underline"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                {c.center.name} · {c.distanceKm.toFixed(1)} km (~{c.walkingMinutes} min a pie)
              </a>
            </li>
          ))}
        </ul>
      )}

      {sources.length > 0 && (
        <p className="text-xs text-slate-400">
          Fuente:{' '}
          {sources.map((t, i) => (
            <span key={t.sourceUrl}>
              {i > 0 && ' · '}
              <a href={t.sourceUrl} target="_blank" rel="noreferrer" className="underline hover:text-slate-200">
                {t.source}
              </a>
            </span>
          ))}
        </p>
      )}
    </li>
  )
}
