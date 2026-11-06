import { useCallback, useEffect, useRef, useState } from 'react'
import type { PatyReply } from '../lib/api'
import { speak, stopSpeaking } from '../lib/speech'
import { browserCanListen, listenOnce, recordUntilSilence } from '../lib/voice'

export type CallState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'unsupported' | 'error'

interface Options {
  /** Envía lo que dijo la persona (texto reconocido por el navegador). */
  ask: (text: string) => Promise<PatyReply | undefined>
  /** Envía el audio grabado para que el servidor lo transcriba (si el navegador no reconoce voz). */
  askAudio: (audio: Blob) => Promise<PatyReply | undefined>
  /** ¿El servidor tiene dictado (Whisper)? Solo se usa si el navegador no reconoce voz. */
  serverCanListen: boolean
}

const MAX_SILENT_TURNS = 3

/**
 * Llamada por voz con Paty: escucha → Paty piensa → responde hablando → vuelve a escuchar, hasta colgar.
 * En una emergencia (triaje grave) la llamada se corta sola para dejar a la vista los botones de llamar.
 */
export function usePatyCall(options: Options) {
  // Siempre las opciones más recientes, sin que "start" cambie en cada render (así no se reinicia la llamada sola)
  const opts = useRef(options)
  useEffect(() => {
    opts.current = options
  })
  const [state, setState] = useState<CallState>('idle')
  const [heard, setHeard] = useState('')
  const [said, setSaid] = useState('')
  const [error, setError] = useState('')
  const ctrlRef = useRef<AbortController | null>(null)

  const hangUp = useCallback(() => {
    ctrlRef.current?.abort()
    ctrlRef.current = null
    stopSpeaking()
    setState('idle')
  }, [])

  const start = useCallback(async () => {
    if (ctrlRef.current) return
    setHeard('')
    setSaid('')
    setError('')
    const { ask, askAudio, serverCanListen } = opts.current
    if (!browserCanListen && !serverCanListen) return setState('unsupported')

    const ctrl = new AbortController()
    ctrlRef.current = ctrl
    const aborted = new Promise<void>((r) => ctrl.signal.addEventListener('abort', () => r(), { once: true }))
    let silentTurns = 0

    try {
      while (!ctrl.signal.aborted) {
        setState('listening')
        let reply: PatyReply | undefined
        if (browserCanListen) {
          const text = await listenOnce(ctrl.signal)
          if (ctrl.signal.aborted) break
          if (!text) {
            if (++silentTurns >= MAX_SILENT_TURNS) break
            continue
          }
          setHeard(text)
          setState('thinking')
          reply = await ask(text)
        } else {
          const audio = await recordUntilSilence(ctrl.signal)
          if (ctrl.signal.aborted) break
          if (!audio) {
            if (++silentTurns >= MAX_SILENT_TURNS) break
            continue
          }
          setState('thinking')
          reply = await askAudio(audio)
        }
        silentTurns = 0
        if (ctrl.signal.aborted) break
        if (!reply) throw new Error('No pude comunicarme con Paty. Revisa tu conexión.')

        setSaid(reply.reply)
        setState('speaking')
        // Espera a que Paty termine de hablar (o a que cuelguen)
        await Promise.race([new Promise<void>((r) => void speak(reply.reply, r)), aborted])
        if (reply.triage.level === 'Grave') break
      }
      if (ctrlRef.current === ctrl) setState('idle')
    } catch (e) {
      if (ctrlRef.current === ctrl) {
        setError((e as Error).message)
        setState('error')
      }
    } finally {
      if (ctrlRef.current === ctrl) ctrlRef.current = null
    }
  }, [])

  useEffect(
    () => () => {
      ctrlRef.current?.abort()
      ctrlRef.current = null // permite volver a llamar si React monta el componente otra vez
      stopSpeaking()
    },
    [],
  )

  return { state, heard, said, error, start, hangUp, close: () => setState('idle') }
}
