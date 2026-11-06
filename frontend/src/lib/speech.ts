import { getCapacidades, getTtsAudio } from './api'

/**
 * Lectura en voz alta de las respuestas de Paty.
 * Con voz en el servidor (Fish Audio) la respuesta se divide en frases que se generan a la vez: empieza a sonar
 * en cuanto llega la primera (~1,5 s en vez de ~7 s para la respuesta entera). Sin servidor, o si falla, lee el
 * navegador con su voz en español, que funciona sin internet. Solo suena una respuesta a la vez.
 */
let current: HTMLAudioElement | null = null
let generation = 0 // cada speak() nuevo invalida al anterior

/** Sin emojis ni enlaces: no se leen bien en voz alta. */
const clean = (text: string) =>
  text
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\p{Extended_Pictographic}|️/gu, '')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * Frases de hasta ~180 caracteres. La primera es la más corta posible, porque de ella depende cuánto tarda en
 * empezar a hablar.
 */
export function splitForSpeech(text: string): string[] {
  const sentences = text.match(/[^.!?:;]+[.!?:;]*/g)?.map((s) => s.trim()).filter(Boolean) ?? [text]
  const parts: string[] = []
  for (const s of sentences) {
    const last = parts.at(-1)
    if (last && parts.length > 1 && last.length + s.length < 180) parts[parts.length - 1] = `${last} ${s}`
    else parts.push(s)
  }
  return parts
}

export function stopSpeaking() {
  generation++
  current?.pause()
  current = null
  if ('speechSynthesis' in window) speechSynthesis.cancel()
}

function playBlob(blob: Blob, isCurrent: () => boolean): Promise<void> {
  return new Promise((resolve) => {
    if (!isCurrent()) return resolve()
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    current = audio
    const done = () => {
      URL.revokeObjectURL(url)
      if (current === audio) current = null
      resolve()
    }
    audio.onended = audio.onerror = done
    audio.onpause = () => !audio.ended && done() // stopSpeaking() pausa: se termina sin esperar
    audio.play().catch(done)
  })
}

function speakWithBrowser(text: string, onEnd?: () => void) {
  if (!('speechSynthesis' in window)) return onEnd?.()
  const u = new SpeechSynthesisUtterance(text)
  const voices = speechSynthesis.getVoices()
  u.voice = voices.find((v) => v.lang === 'es-PE') ?? voices.find((v) => v.lang.startsWith('es')) ?? null
  u.lang = u.voice?.lang ?? 'es-PE'
  u.rate = 1.05 // ágil pero claro
  u.onend = u.onerror = () => onEnd?.()
  speechSynthesis.speak(u)
}

export async function speak(text: string, onEnd?: () => void): Promise<void> {
  stopSpeaking()
  const id = generation
  const isCurrent = () => id === generation
  const t = clean(text)
  if (!t) return onEnd?.()

  if ((await getCapacidades()).vozServidor && isCurrent()) {
    // Todas las frases se piden a la vez; se reproducen en orden apenas llega cada una
    const pending = splitForSpeech(t).map((part) => getTtsAudio(part))
    const first = await pending[0]
    if (first && isCurrent()) {
      await playBlob(first, isCurrent)
      for (const next of pending.slice(1)) {
        const blob = await next
        if (!isCurrent()) break
        if (blob) await playBlob(blob, isCurrent)
      }
      if (isCurrent()) onEnd?.()
      return
    }
    if (!isCurrent()) return
  }
  speakWithBrowser(t, onEnd)
}
