/**
 * Escuchar a la persona para la llamada con Paty.
 * 1) Reconocimiento de voz del navegador (Chrome, Edge, Safari): no necesita nada en el servidor.
 * 2) Si el navegador no lo tiene: graba y corta solo cuando la persona deja de hablar, para enviarlo a Whisper.
 */

// La Web Speech API aún no está en los tipos estándar del DOM
type Recognition = {
  lang: string
  interimResults: boolean
  continuous: boolean
  maxAlternatives: number
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  abort: () => void
}
type RecognitionCtor = new () => Recognition

const RecognitionImpl: RecognitionCtor | undefined =
  typeof window === 'undefined'
    ? undefined
    : ((window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: RecognitionCtor }).webkitSpeechRecognition)

export const browserCanListen = !!RecognitionImpl

/** Escucha una frase con el reconocimiento del navegador. Devuelve "" si no se oyó nada. */
export function listenOnce(signal: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new RecognitionImpl!()
    r.lang = 'es-PE'
    r.interimResults = false
    r.continuous = false
    r.maxAlternatives = 1
    let text = ''
    let failed = false
    r.onresult = (e) => {
      text = Array.from(e.results, (alt) => alt[0].transcript).join(' ')
    }
    r.onerror = (e) => {
      if (e.error === 'no-speech' || e.error === 'aborted') return // termina en onend con texto vacío
      failed = true
      reject(new Error(e.error === 'not-allowed' ? 'Necesito permiso para usar el micrófono.' : 'No pude escucharte.'))
    }
    r.onend = () => !failed && resolve(text.trim())
    signal.addEventListener('abort', () => r.abort(), { once: true })
    r.start()
  })
}

/**
 * Graba hasta que la persona deja de hablar (1,5 s de silencio), con tope de 20 s.
 * Devuelve null si no habló (8 s sin voz) o si se cortó la llamada.
 */
export async function recordUntilSilence(signal: AbortSignal): Promise<Blob | null> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const rec = new MediaRecorder(stream)
  const chunks: Blob[] = []
  const ctx = new AudioContext()
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 1024
  ctx.createMediaStreamSource(stream).connect(analyser)
  const samples = new Uint8Array(analyser.fftSize)
  const start = performance.now()
  let spoke = false
  let lastVoice = start

  return new Promise((resolve) => {
    const stop = () => rec.state === 'recording' && rec.stop()
    rec.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data)
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop())
      void ctx.close()
      resolve(spoke && !signal.aborted && chunks.length ? new Blob(chunks, { type: rec.mimeType }) : null)
    }
    const tick = () => {
      if (rec.state !== 'recording') return
      analyser.getByteTimeDomainData(samples)
      let peak = 0
      for (const v of samples) peak = Math.max(peak, Math.abs(v - 128))
      const now = performance.now()
      // ponytail: umbral de voz fijo; con mucho ruido de fondo puede no cortar solo (corta a los 20 s)
      if (peak > 12) {
        spoke = true
        lastVoice = now
      }
      if ((spoke && now - lastVoice > 1500) || now - start > 20000 || (!spoke && now - start > 8000)) return stop()
      setTimeout(tick, 100)
    }
    signal.addEventListener('abort', stop, { once: true })
    rec.start()
    tick()
  })
}
