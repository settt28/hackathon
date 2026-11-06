/**
 * Solo enlaces http(s). Las URLs de fuentes vienen de la base de datos: un "javascript:" se ejecutaría al hacer clic.
 * Devuelve undefined si no es segura (el enlace se muestra como texto).
 */
export function safeUrl(url?: string | null): string | undefined {
  if (!url) return undefined
  try {
    const u = new URL(url)
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : undefined
  } catch {
    return undefined
  }
}
