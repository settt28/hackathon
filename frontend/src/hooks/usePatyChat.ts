import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, sendPatyMessage, sendPatyVoice, type PatyReply } from '../lib/api'
import { isOnline } from '../lib/connection'
import { getPosition } from '../lib/geo'
import { answerOffline } from '../lib/localPaty'
import { speak, stopSpeaking } from '../lib/speech'

export type ChatMessage =
  | { id: string; role: 'user'; text: string; voice?: boolean }
  | { id: string; role: 'paty'; text: string; data?: PatyReply; error?: boolean }

const id = () => crypto.randomUUID()

/** Estado de la conversación con Paty: mensajes de texto o voz, envío y cancelación al salir de la vista. */
export function usePatyChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sending, setSending] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(
    () => () => {
      abortRef.current?.abort()
      stopSpeaking()
    },
    [],
  )

  /** Flujo común: agrega el mensaje del usuario, pide la respuesta y la agrega (o el error). */
  const run = useCallback(
    async (
      userMsg: ChatMessage & { role: 'user' },
      ask: (signal: AbortSignal) => Promise<{ reply: PatyReply; userText?: string }>,
      autoSpeak = true,
    ): Promise<PatyReply | undefined> => {
      if (abortRef.current) return undefined
      const ctrl = new AbortController()
      abortRef.current = ctrl
      setSending(true)
      setMessages((m) => [...m, userMsg])
      try {
        const { reply, userText } = await ask(ctrl.signal)
        setMessages((m) => [
          ...m.map((x) => (x.id === userMsg.id && userText ? { ...x, text: userText } : x)),
          { id: id(), role: 'paty', text: reply.reply, data: reply },
        ])
        // A quien habla, Paty le responde hablando (en la llamada lo maneja la propia llamada)
        if (userMsg.voice && autoSpeak) void speak(reply.reply)
        return reply
      } catch (e) {
        if ((e as Error).name === 'AbortError') return undefined
        const msg = e instanceof ApiError ? e.message : 'Ocurrió un error inesperado.'
        setMessages((m) => [...m, { id: id(), role: 'paty', text: msg, error: true }])
        return undefined
      } finally {
        if (abortRef.current === ctrl) abortRef.current = null
        setSending(false)
      }
    },
    [],
  )

  const send = useCallback(
    (raw: string) => {
      const text = raw.trim().slice(0, 1000) // límite del backend
      if (!text) return Promise.resolve(undefined)
      return run({ id: id(), role: 'user', text }, async (signal) => {
        const coords = await getPosition()

        // Sin conexión responde la IA local del teléfono (lib/localPaty.ts) con los datos guardados
        if (!isOnline()) {
          const local = await answerOffline(text, coords ?? null)
          if (local) return { reply: local }
          throw new ApiError('Sin conexión y todavía no se guardaron los datos de tu zona en este teléfono. Conéctate una vez para que Paty funcione sin internet.')
        }

        try {
          return { reply: await sendPatyMessage({ message: text, ...coords }, signal) }
        } catch (e) {
          // La conexión se cayó a mitad del envío: se responde igual con lo que hay en el teléfono
          if ((e as Error).name === 'AbortError') throw e
          const local = await answerOffline(text, coords ?? null)
          if (local) return { reply: local }
          throw e
        }
      })
    },
    [run],
  )

  const sendVoice = useCallback(
    (audio: Blob, autoSpeak = true) =>
      run(
        { id: id(), role: 'user', text: '🎤 Mensaje de voz…', voice: true },
        async (signal) => {
          // Transcribir audio necesita el servidor (Whisper). Sin conexión se pide escribir:
          // el texto sí lo atiende la IA local. Paty lo dice en voz alta con la voz del navegador.
          if (!isOnline())
            throw new ApiError('Sin conexión no puedo escuchar tu audio, pero sí puedo ayudarte si me lo escribes.')
          const r = await sendPatyVoice(audio, await getPosition(), signal)
          return { reply: r.respuesta, userText: `🎤 ${r.transcripcion}` }
        },
        autoSpeak,
      ),
    [run],
  )

  return { messages, sending, send, sendVoice }
}
