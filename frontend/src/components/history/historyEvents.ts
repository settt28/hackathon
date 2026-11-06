import { Cloud, Droplet, Menu, Sun, Zap, type LucideIcon } from 'lucide-react'

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

/** Datos mock del historial (sin backend en esta etapa). */
export const HISTORY_EVENTS: HistoryEvent[] = [
  {
    id: 'nino-2024',
    year: 2024,
    title: 'El Niño Costero',
    category: 'clima',
    icon: Cloud,
    iconClassName: 'text-amber-500 dark:text-amber-400',
    tag: 'Hidrometeorológico',
    tagClassName: 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-400/50 dark:bg-amber-400/10 dark:text-amber-300',
    description: 'Precipitaciones anómalas e inundaciones fluviales registradas en la costa central con elevación térmica marina.',
    region: 'Costa central',
  },
  {
    id: 'yaku-2023',
    year: 2023,
    title: 'Ciclón Yaku',
    category: 'clima',
    icon: Sun,
    iconClassName: 'text-red-500 dark:text-red-400',
    tag: 'Ciclónico',
    tagClassName: 'border-red-300 bg-red-50 text-red-700 dark:border-red-400/50 dark:bg-red-400/10 dark:text-red-300',
    description: 'Lluvias intensas, desbordes y huaicos en la costa norte y central por el paso del ciclón Yaku.',
    region: 'Costa norte y central',
  },
  {
    id: 'oleajes-2022',
    year: 2022,
    title: 'Oleajes Anómalos',
    category: 'mar',
    icon: Menu,
    iconClassName: 'text-sky-500 dark:text-sky-400',
    tag: 'Marítimo',
    tagClassName: 'border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-400/50 dark:bg-sky-400/10 dark:text-sky-300',
    description: 'Oleaje de moderada a fuerte intensidad con cierre temporal de puertos y caletas en el litoral.',
    region: 'Litoral',
  },
  {
    id: 'sismo-2021',
    year: 2021,
    title: 'Sismo Costa Central',
    category: 'sismos',
    icon: Zap,
    iconClassName: 'text-orange-500 dark:text-orange-400',
    tag: '6.0 Mw',
    tagClassName: 'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-400/50 dark:bg-orange-400/10 dark:text-orange-300',
    description: 'Sismo de magnitud 6.0 con epicentro frente a la costa central, sin daños mayores reportados en la zona.',
    region: 'Costa central',
  },
  {
    id: 'lloviznas-2020',
    year: 2020,
    title: 'Lloviznas Críticas',
    category: 'clima',
    icon: Droplet,
    iconClassName: 'text-teal-500 dark:text-teal-400',
    tag: 'Humedad',
    tagClassName: 'border-teal-300 bg-teal-50 text-teal-700 dark:border-teal-400/50 dark:bg-teal-400/10 dark:text-teal-300',
    description: 'Lloviznas persistentes y alta humedad que afectaron techos y viviendas precarias de la zona.',
    region: 'Costa central',
  },
]
