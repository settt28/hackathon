/** Saludo según la hora local: mañana (5–11), tarde (12–18) o noche. */
export function useGreeting(date: Date = new Date()): string {
  const hour = date.getHours()
  if (hour >= 5 && hour < 12) return 'Buenos días'
  if (hour >= 12 && hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
}
