import { Activity, Flame, Shield, TriangleAlert, type LucideIcon } from 'lucide-react'

/** Clases de color de una tarjeta (completas para que Tailwind las incluya en el build). */
interface ServiceTheme {
  card: string
  iconBox: string
  number: string
  button: string
}

/** Organismo de emergencia con su número y página oficial. */
export interface EmergencyService {
  id: string
  number: string
  name: string
  description: string
  website: string
  icon: LucideIcon
  theme: ServiceTheme
}

/** Datos de las líneas de emergencia (mock de la UI; sin backend). */
export const EMERGENCY_SERVICES: EmergencyService[] = [
  {
    id: 'policia',
    number: '105',
    name: 'Policía Nacional',
    description: 'Robos, asaltos y delitos',
    website: 'https://www.policia.gob.pe',
    icon: Shield,
    theme: {
      card: 'border-sky-200 dark:border-sky-400/30',
      iconBox: 'border-sky-300 bg-sky-50 text-sky-600 dark:border-sky-400/40 dark:bg-sky-400/15 dark:text-sky-400',
      number: 'text-sky-600 dark:text-sky-400',
      button: 'bg-sky-400 hover:bg-sky-300 focus-visible:ring-sky-300',
    },
  },
  {
    id: 'bomberos',
    number: '116',
    name: 'Bomberos',
    description: 'Incendios y rescates',
    website: 'https://www.bomberosperu.gob.pe',
    icon: Flame,
    theme: {
      card: 'border-orange-200 dark:border-orange-400/30',
      iconBox: 'border-orange-300 bg-orange-50 text-orange-600 dark:border-orange-400/40 dark:bg-orange-400/15 dark:text-orange-400',
      number: 'text-orange-500 dark:text-orange-400',
      button: 'bg-orange-400 hover:bg-orange-300 focus-visible:ring-orange-300',
    },
  },
  {
    id: 'essalud',
    number: '117',
    name: 'EsSalud',
    description: 'Emergencias médicas',
    website: 'https://www.essalud.gob.pe',
    icon: Activity,
    theme: {
      card: 'border-teal-200 dark:border-teal-400/30',
      iconBox: 'border-teal-300 bg-teal-50 text-teal-600 dark:border-teal-400/40 dark:bg-teal-400/15 dark:text-teal-400',
      number: 'text-teal-600 dark:text-teal-400',
      button: 'bg-teal-400 hover:bg-teal-300 focus-visible:ring-teal-300',
    },
  },
  {
    id: 'defensa-civil',
    number: '115',
    name: 'Defensa Civil',
    description: 'Sismos y desastres',
    website: 'https://www.gob.pe/indeci',
    icon: TriangleAlert,
    theme: {
      card: 'border-yellow-300 dark:border-yellow-400/30',
      iconBox: 'border-yellow-300 bg-yellow-50 text-yellow-600 dark:border-yellow-400/40 dark:bg-yellow-400/15 dark:text-yellow-400',
      number: 'text-yellow-500 dark:text-yellow-400',
      button: 'bg-yellow-400 hover:bg-yellow-300 focus-visible:ring-yellow-300',
    },
  },
]
