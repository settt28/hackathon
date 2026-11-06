import { getCapacidades, getTtsAudio } from './api'

/**
 * Lectura en voz alta de las respuestas de Paty.
 * Si el servidor tiene voz (Fish Audio) la usa; si no, o si falla, lee el navegador con su voz en español,
 * que funciona sin internet. Solo suena una respuesta a la vez.
 */
let current: HTMLAudioElement | null = null

/** Sin emojis ni enlaces: no se leen bien en voz alta. */
const clean = (text: string) =>
  text
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\p{Extended_Pictographic}|️/gu, '')
    .replace(/\s+/g, ' ')
    .trim()

export function stopSpeaking() {
  current?.pause()
  current = null
  if ('speechSynthesis' in window) speechSynthesis.cancel()
}

export async function speak(text: string, onEnd?: () => void): Promise<void> {
  stopSpeaking()
  const t = clean(text)
  if (!t) return onEnd?.()

  if ((await getCapacidades()).vozServidor) {
    const mp3 = await getTtsAudio(t)
    if (mp3) {
      const url = URL.createObjectURL(mp3)
      const audio = new Audio(url)
      current = audio
      audio.onended = audio.onerror = () => {
        URL.revokeObjectURL(url)
        if (current === audio) current = null
        onEnd?.()
      }
      return audio.play().catch(() => onEnd?.())
    }
  }

  if (!('speechSynthesis' in window)) return onEnd?.()
  const u = new SpeechSynthesisUtterance(t)
  const voices = speechSynthesis.getVoices()
  u.voice = voices.find((v) => v.lang === 'es-PE') ?? voices.find((v) => v.lang.startsWith('es')) ?? null
  u.lang = u.voice?.lang ?? 'es-PE'
  u.rate = 0.95 // un poco más lento: se entiende mejor
  u.onend = u.onerror = () => onEnd?.()
  speechSynthesis.speak(u)
}
