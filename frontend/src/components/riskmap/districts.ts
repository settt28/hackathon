import { Activity, Droplet, Mountain, type LucideIcon } from 'lucide-react'

export type RiskLevel = 'bajo' | 'moderado' | 'alto' | 'muy-alto'

/** Estilos por nivel de riesgo (SVG + clases de Tailwind completas para que entren en el build). */
export const RISK_STYLES: Record<
  RiskLevel,
  { label: string; stroke: string; fill: string; dot: string; badge: string; value: string; cardBorder: string }
> = {
  bajo: {
    label: 'Bajo',
    stroke: '#22c55e',
    fill: 'rgba(34,197,94,0.28)',
    dot: 'bg-green-500',
    badge: 'bg-green-500 text-[#05210f]',
    value: 'text-green-600 dark:text-green-400',
    cardBorder: 'border-green-300 dark:border-green-400/40',
  },
  moderado: {
    label: 'Moderado',
    stroke: '#eab308',
    fill: 'rgba(234,179,8,0.32)',
    dot: 'bg-yellow-500',
    badge: 'bg-yellow-500 text-[#2b1f00]',
    value: 'text-yellow-600 dark:text-yellow-400',
    cardBorder: 'border-yellow-300 dark:border-yellow-400/40',
  },
  alto: {
    label: 'Alto',
    stroke: '#f97316',
    fill: 'rgba(249,115,22,0.3)',
    dot: 'bg-orange-500',
    badge: 'bg-orange-500 text-[#2b1100]',
    value: 'text-orange-600 dark:text-orange-400',
    cardBorder: 'border-orange-300 dark:border-orange-400/40',
  },
  'muy-alto': {
    label: 'Muy alto',
    stroke: '#ef4444',
    fill: 'rgba(239,68,68,0.34)',
    dot: 'bg-red-500',
    badge: 'bg-red-500 text-white',
    value: 'text-red-600 dark:text-red-400',
    cardBorder: 'border-red-300 dark:border-red-400/40',
  },
}

export const RISK_ORDER: RiskLevel[] = ['bajo', 'moderado', 'alto', 'muy-alto']

const HAZARDS: Record<string, LucideIcon> = { Inundación: Droplet, Huaico: Mountain, Sismo: Activity }

/** Distrito del mapa de riesgo. `points` está en el sistema de coordenadas de MAP_VIEWBOX. */
export interface District {
  id: string
  name: string
  risk: RiskLevel
  hazard: keyof typeof HAZARDS
  /** Probabilidad estimada de emergencia este mes (%). */
  probability: number
  points: [number, number][]
}

export const hazardIcon = (hazard: string): LucideIcon => HAZARDS[hazard] ?? Droplet

/** Área visible del mapa (x, y, ancho, alto). */
export const MAP_VIEWBOX = { x: 35, y: 178, width: 710, height: 680 }

/** Posición del usuario en el mapa (mismo sistema de coordenadas). */
export const USER_POSITION: [number, number] = [445, 588]
export const USER_DISTRICT_ID = 'pachacamac'

/** Distritos de ejemplo (datos mock; formas simplificadas, no cartográficas). */
export const DISTRICTS: District[] = [
  { id: 'breña', name: 'Breña', risk: 'moderado', hazard: 'Sismo', probability: 2, points: [[75, 257], [215, 217], [275, 318], [195, 397], [95, 368]] },
  { id: 'cercado', name: 'Cercado de Lima', risk: 'moderado', hazard: 'Sismo', probability: 2, points: [[215, 217], [375, 207], [385, 327], [275, 318]] },
  { id: 'el-agustino', name: 'El Agustino', risk: 'alto', hazard: 'Huaico', probability: 4, points: [[375, 207], [615, 237], [635, 357], [385, 327]] },
  { id: 'chaclacayo', name: 'Chaclacayo', risk: 'muy-alto', hazard: 'Huaico', probability: 7, points: [[615, 237], [725, 277], [718, 410], [635, 357]] },
  { id: 'santa-anita', name: 'Santa Anita', risk: 'alto', hazard: 'Inundación', probability: 3, points: [[385, 327], [635, 357], [615, 477], [395, 457]] },
  { id: 'la-victoria', name: 'La Victoria', risk: 'bajo', hazard: 'Sismo', probability: 1, points: [[275, 318], [385, 327], [395, 457], [295, 497], [225, 517], [195, 397]] },
  { id: 'jesus-maria', name: 'Jesús María', risk: 'moderado', hazard: 'Sismo', probability: 1, points: [[95, 368], [195, 397], [225, 517], [115, 557], [65, 457]] },
  { id: 'ate', name: 'Ate', risk: 'moderado', hazard: 'Huaico', probability: 3, points: [[635, 357], [718, 410], [725, 577], [615, 477]] },
  { id: 'san-borja', name: 'San Borja', risk: 'moderado', hazard: 'Sismo', probability: 1, points: [[115, 557], [225, 517], [295, 497], [315, 637], [195, 697], [105, 657]] },
  { id: 'surco', name: 'Santiago de Surco', risk: 'bajo', hazard: 'Sismo', probability: 1, points: [[105, 657], [195, 697], [315, 637], [355, 737], [275, 827], [135, 797]] },
  { id: 'pachacamac', name: 'Pachacamac', risk: 'moderado', hazard: 'Inundación', probability: 1, points: [[295, 497], [395, 457], [615, 477], [725, 577], [695, 777], [495, 817], [355, 737], [315, 637]] },
]

/** Centroide aproximado (promedio de vértices) para ubicar etiquetas. */
export const centroid = (points: [number, number][]): [number, number] => [
  points.reduce((s, p) => s + p[0], 0) / points.length,
  points.reduce((s, p) => s + p[1], 0) / points.length,
]
