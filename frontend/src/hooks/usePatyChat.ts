import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError, sendPatyMessage, type PatyReply } from '../lib/api'
import { getPosition } from '../lib/geo'

export type ChatMessage =
  | { id: string; role: 'user'; text: string }
  | { id: string; role: 'paty'; text: string; data?: PatyReply; error?: boolean }

/** Estado de la conversación con Paty: mensajes, envío y cancelación al salir de la vista. */
export function usePatyChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [sending, setSending] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => () => abortRef.current?.abort(), [])

  const send = useCallback(async (raw: string) => {
    const text = raw.trim().slice(0, 1000) // límite del backend
    if (!text || abortRef.current) return
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setSending(true)
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: 'user', text }])

    try {
      const coords = await getPosition()
      const data = await sendPatyMessage({ message: text, ...coords }, ctrl.signal)
      setMessages((m) => [...m, { id: crypto.randomUUID(), role: 'paty', text: data.reply, data }])
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
      const msg = e instanceof ApiError ? e.message : 'Ocurrió un error inesperado.'
      setMessages((m) => [...m, { id: crypto.randomUUID(), role: 'paty', text: msg, error: true }])
    } finally {
      if (abortRef.current === ctrl) abortRef.current = null
      setSending(false)
    }
  }, [])

  return { messages, sending, send }
}
