import { Compass, Cross, Sun, TriangleAlert, Wind, type LucideIcon } from 'lucide-react'

/** Sugerencia rápida que el usuario puede tocar para iniciar la conversación. */
export interface Suggestion {
  id: string
  text: string
  icon: LucideIcon
  /** Color del ícono (clase completa de Tailwind para que se incluya en el build). */
  iconClassName: string
}

/** Datos mock de las sugerencias iniciales (sin backend en esta etapa). */
export const SUGGESTIONS: Suggestion[] = [
  { id: 'pronostico', text: '¿Cuál es el pronóstico del tiempo para hoy?', icon: Sun, iconClassName: 'text-yellow-400' },
  { id: 'alertas', text: 'Consultar alertas meteorológicas y avisos', icon: TriangleAlert, iconClassName: 'text-yellow-400' },
  { id: 'monitoreo', text: 'Información sobre el monitoreo ambiental', icon: Wind, iconClassName: 'text-sky-400' },
  { id: 'comunidad', text: 'Conocer proyectos y actividades comunitarias', icon: Compass, iconClassName: 'text-emerald-400' },
  { id: 'centro-salud', text: '¿Dónde queda el centro de salud más cercano?', icon: Cross, iconClassName: 'text-violet-300' },
]
