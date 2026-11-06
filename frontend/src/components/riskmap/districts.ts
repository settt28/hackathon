import { Activity, CloudRain, Droplet, Mountain, Waves, type LucideIcon } from 'lucide-react'
import type { RiskDistrict } from '../../lib/api'

/** Niveles que devuelve el backend (properties.nivel). */
export type RiskLevel = RiskDistrict['properties']['nivel']

/** Estilos por nivel de riesgo (clases de Tailwind completas para que entren en el build). */
export const RISK_STYLES: Record<RiskLevel, { label: string; badge: string; value: string; cardBorder: string }> = {
  bajo: {
    label: 'Bajo',
    badge: 'bg-green-500 text-[#05210f]',
    value: 'text-green-600 dark:text-green-400',
    cardBorder: 'border-green-300 dark:border-green-400/40',
  },
  moderado: {
    label: 'Moderado',
    badge: 'bg-yellow-500 text-[#2b1f00]',
    value: 'text-yellow-600 dark:text-yellow-400',
    cardBorder: 'border-yellow-300 dark:border-yellow-400/40',
  },
  alto: {
    label: 'Alto',
    badge: 'bg-orange-500 text-[#2b1100]',
    value: 'text-orange-600 dark:text-orange-400',
    cardBorder: 'border-orange-300 dark:border-orange-400/40',
  },
  'muy alto': {
    label: 'Muy alto',
    badge: 'bg-red-500 text-white',
    value: 'text-red-600 dark:text-red-400',
    cardBorder: 'border-red-300 dark:border-red-400/40',
  },
}

const HAZARDS: Record<string, LucideIcon> = {
  huaico: Mountain,
  deslizamiento: Mountain,
  inundación: Droplet,
  'lluvias intensas': CloudRain,
  'oleaje anómalo': Waves,
}

/** Ícono del peligro principal ("huaico", "inundación"…). */
export const hazardIcon = (hazard?: string | null): LucideIcon => (hazard && HAZARDS[hazard.toLowerCase()]) || Activity
