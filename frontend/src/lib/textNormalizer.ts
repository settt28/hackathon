/**
 * Normaliza texto en español: minúsculas, sin tildes y sin signos de puntuación.
 * Puerto exacto de ElNino.Core/Services/TextNormalizer.cs: la IA local del dispositivo debe
 * entender las mismas palabras que el servidor, o Paty respondería distinto sin conexión.
 */

export function normalize(text: string | null | undefined): string {
  if (!text?.trim()) return ''
  return (
    text
      .toLowerCase()
      .normalize('NFD')
      // Quita las tildes (marcas diacríticas) y cambia todo lo que no sea letra o número por un espacio
      .replace(/\p{Mn}/gu, '')
      .replace(/[^\p{L}\p{N}]/gu, ' ')
      .split(' ')
      .filter(Boolean)
      .join(' ')
  )
}

// Palabras muy comunes que no aportan a la búsqueda
const STOP_WORDS = new Set([
  'una', 'uno', 'unos', 'unas', 'los', 'las', 'del', 'que', 'con', 'por', 'para', 'hay', 'mis', 'tus', 'sus',
  'como', 'donde', 'cual', 'cuando', 'esta', 'este', 'esto', 'estan', 'muy', 'mas', 'pero', 'sin', 'sobre',
  'tengo', 'tiene', 'hago', 'hacer', 'puedo', 'debo', 'quiero', 'algo', 'ante', 'entre', 'hasta', 'desde',
])

/** Palabras significativas (más de 2 letras y que no sean muletillas) del texto normalizado. */
export function words(text: string | null | undefined): string[] {
  return normalize(text)
    .split(' ')
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
}

/** True si el término (puede ser una frase) aparece como palabra(s) completa(s). */
export function containsTerm(normalizedText: string, normalizedTerm: string): boolean {
  return (
    ` ${normalizedText} `.includes(` ${normalizedTerm} `) ||
    (normalizedTerm.length >= 5 && normalizedText.includes(normalizedTerm))
  )
}

/**
 * Coincidencia exacta o por raíz común:
 * "inundacion" ~ "inundaciones", "cultivo" ~ "cultivos", "protejo" ~ "proteger".
 */
export function sameStem(a: string, b: string): boolean {
  if (a === b) return true
  if (a.length < 4 || b.length < 4) return false
  if (a.startsWith(b) || b.startsWith(a)) return true

  let common = 0
  while (common < a.length && common < b.length && a[common] === b[common]) common++
  return common >= 5
}
