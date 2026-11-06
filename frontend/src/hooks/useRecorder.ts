import { useCallback, useEffect, useRef, useState } from 'react'

const MAX_SECONDS = 60

/** Graba un mensaje de voz con el micrófono. Se corta solo al minuto para no subir audios enormes por redes lentas. */
export function useRecorder(onAudio: (audio: Blob) => void) {
  const [recording, setRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recRef = useRef<MediaRecorder | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const supported = typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia

  const stop = useCallback(() => {
    clearTimeout(timer.current)
    if (recRef.current?.state === 'recording') recRef.current.stop()
  }, [])

  const start = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream)
      const chunks: Blob[] = []
      rec.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data)
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        recRef.current = null
        setRecording(false)
        if (chunks.length) onAudio(new Blob(chunks, { type: rec.mimeType }))
      }
      recRef.current = rec
      rec.start()
      setRecording(true)
      timer.current = setTimeout(stop, MAX_SECONDS * 1000)
    } catch {
      setError('No pude usar el micrófono. Revisa el permiso del navegador.')
    }
  }, [onAudio, stop])

  // Al salir de la vista: soltar el micrófono sin enviar nada
  useEffect(
    () => () => {
      clearTimeout(timer.current)
      const rec = recRef.current
      if (rec) {
        rec.onstop = () => rec.stream.getTracks().forEach((t) => t.stop())
        if (rec.state === 'recording') rec.stop()
      }
    },
    [],
  )

  return { supported, recording, error, start, stop }
}
