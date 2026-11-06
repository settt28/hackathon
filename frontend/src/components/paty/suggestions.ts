import { HeartPulse, House, MessageCircleQuestion, Sprout, type LucideIcon } from 'lucide-react'

/** Sugerencia rápida que el usuario puede tocar para iniciar la conversación. */
export interface Suggestion {
  id: string
  text: string
  icon: LucideIcon
  /** Color del ícono en ambos temas (clases completas de Tailwind para que se incluyan en el build). */
  iconClassName: string
  /** Caja del ícono con borde y fondo tintado, igual que los íconos de las tarjetas del dashboard. */
  iconBoxClassName: string
  /** Pregunta que se envía a Paty al tocarla. Sin ella, solo se enfoca el campo de texto. */
  prompt?: string
}

/** Sugerencias iniciales: las de tema envían una pregunta concreta a Paty. */
export const SUGGESTIONS: Suggestion[] = [
  {
    id: 'pregunta',
    text: 'Qué tema quieres preguntarme',
    icon: MessageCircleQuestion,
    iconClassName: 'text-sky-600 dark:text-cyan-300',
    iconBoxClassName: 'border-sky-200 bg-sky-50 dark:border-cyan-400/30 dark:bg-cyan-400/10',
  },
  {
    id: 'salud',
    prompt: '¿Cómo protejo a mi familia del dengue y otras enfermedades por las lluvias?',
    text: 'Salud',
    icon: HeartPulse,
    iconClassName: 'text-red-600 dark:text-red-400',
    iconBoxClassName: 'border-red-200 bg-red-50 dark:border-red-400/40 dark:bg-red-400/10',
  },
  {
    id: 'cultivos',
    prompt: '¿Cómo protejo mis cultivos ante lluvias intensas e inundaciones?',
    text: 'Cultivos',
    icon: Sprout,
    iconClassName: 'text-emerald-600 dark:text-emerald-300',
    iconBoxClassName: 'border-emerald-300 bg-emerald-50 dark:border-emerald-400/40 dark:bg-emerald-400/10',
  },
  {
    id: 'casa',
    prompt: '¿Cómo preparo mi casa ante un huaico o inundación?',
    text: 'Mi casa',
    icon: House,
    iconClassName: 'text-amber-600 dark:text-amber-300',
    iconBoxClassName: 'border-amber-300 bg-amber-50 dark:border-amber-400/40 dark:bg-amber-400/10',
  },
]
