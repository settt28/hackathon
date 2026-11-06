/** "hace 10 min", "hace 3 h", "ayer", "el 5 nov": cuánto tiempo tienen los datos que se están viendo. */
export function describeAge(savedAt: number): string {
  const minutes = Math.round((Date.now() - savedAt) / 60000)
  if (minutes < 2) return 'hace un momento'
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.round(hours / 24)
  if (days === 1) return 'ayer'
  if (days < 7) return `hace ${days} días`
  return `el ${new Date(savedAt).toLocaleDateString('es-PE', { day: 'numeric', month: 'short' })}`
}
