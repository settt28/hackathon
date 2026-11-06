import { Cloud, CloudRain, Droplet, Mountain, Waves, type LucideIcon } from 'lucide-react'
import type { HistoricalEvent } from '../../lib/api'

/** Categorías de los filtros del registro histórico. */
export type EventCategory = 'clima' | 'mar' | 'sismos'

export const FILTERS: { id: EventCategory | 'todos'; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'clima', label: 'Clima' },
  { id: 'mar', label: 'Mar' },
  { id: 'sismos', label: 'Sismos' },
]

/** Evento histórico de la zona. */
export interface HistoryEvent {
  id: string
  year: number
  title: string
  category: EventCategory
  icon: LucideIcon
  /** Clases del ícono (color). */
  iconClassName: string
  tag: string
  /** Clases de la etiqueta (borde, fondo y texto). */
  tagClassName: string
  description: string
  region: string
}

const HAZARD: Record<HistoricalEvent['hazard'], { name: string; icon: LucideIcon; iconClassName: string; category: EventCategory }> = {
  LluviaIntensa: { name: 'Lluvias intensas', icon: CloudRain, iconClassName: 'text-sky-500 dark:text-sky-400', category: 'clima' },
  Inundacion: { name: 'Inundación', icon: Droplet, iconClassName: 'text-blue-500 dark:text-blue-400', category: 'clima' },
  Huaico: { name: 'Huaico', icon: Mountain, iconClassName: 'text-amber-600 dark:text-amber-400', category: 'clima' },
  Deslizamiento: { name: 'Deslizamiento', icon: Mountain, iconClassName: 'text-orange-500 dark:text-orange-400', category: 'clima' },
  Marejada: { name: 'Oleaje anómalo', icon: Waves, iconClassName: 'text-cyan-500 dark:text-cyan-400', category: 'mar' },
  Dengue: { name: 'Dengue', icon: Cloud, iconClassName: 'text-rose-500 dark:text-rose-400', category: 'clima' },
  Epidemia: { name: 'Epidemia', icon: Cloud, iconClassName: 'text-rose-500 dark:text-rose-400', category: 'clima' },
  Otro: { name: 'Otro', icon: Cloud, iconClassName: 'text-slate-500 dark:text-slate-400', category: 'clima' },
}

// Etiqueta según el daño registrado (clases completas para que Tailwind las incluya en el build)
const SEVERITY: Record<string, string> = {
  fuerte: 'border-red-300 bg-red-50 text-red-700 dark:border-red-400/50 dark:bg-red-400/10 dark:text-red-300',
  moderado: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-400/50 dark:bg-amber-400/10 dark:text-amber-300',
  leve: 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-400/50 dark:bg-sky-400/10 dark:text-sky-300',
}

/** Emergencia real del INDECI (SINPAD) → evento de la línea de tiempo. */
export function toHistoryEvent(e: HistoricalEvent): HistoryEvent {
  const h = HAZARD[e.hazard] ?? HAZARD.Otro
  const date = new Date(e.date)
  return {
    id: e.id,
    year: date.getUTCFullYear(),
    title: e.sourceEventType || h.name,
    category: h.category,
    icon: h.icon,
    iconClassName: h.iconClassName,
    tag: `${h.name} · ${e.severity || 'sin dato'}`,
    tagClassName: SEVERITY[e.severity] ?? SEVERITY.leve,
    description: e.description,
    region: `${e.district}, ${date.toLocaleDateString('es-PE', { timeZone: 'UTC' })} · ${e.source}`,
  }
}
