import { CloudSun } from 'lucide-react'
import type { FC } from 'react'
import clsx from 'clsx'

// Colores de los 8 pétalos en sentido horario empezando por arriba (dorados arriba/izquierda, azules abajo/derecha)
const PETALS = ['#facc15', '#eab308', '#38bdf8', '#3b82f6', '#0ea5e9', '#60a5fa', '#facc15', '#fde047']

interface PatyLogoProps {
  /** Tamaño del contenedor (clases de Tailwind). Por defecto, el tamaño grande del hero. */
  className?: string
  /** Tamaño del ícono central. */
  iconClassName?: string
  /** Muestra el halo luminoso detrás del logo. */
  glow?: boolean
  /** Color del halo (por defecto, dorado). */
  glowClassName?: string
}

/**
 * Logo "sol/flor tecnológico" de Paty.
 * Solo los pétalos giran (animate-spin-slow); el disco central queda fijo para que el ícono sea legible.
 * `motion-safe` respeta la preferencia del sistema de reducir animaciones.
 */
const PatyLogo: FC<PatyLogoProps> = ({
  className = 'h-40 w-40',
  iconClassName = 'h-9 w-9',
  glow = true,
  glowClassName = 'bg-yellow-300/30 dark:bg-yellow-300/20',
}) => (
  <div className={clsx('relative shrink-0', className)} role="img" aria-label="Logo de Paty">
    {glow && <div className={clsx('absolute inset-[15%] rounded-full blur-2xl', glowClassName)} aria-hidden />}

    <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full motion-safe:animate-spin-slow" aria-hidden>
      {PETALS.map((color, i) => (
        <ellipse key={i} cx="100" cy="42" rx="19" ry="30" fill={color} transform={`rotate(${i * 45} 100 100)`} />
      ))}
    </svg>

    {/* Disco central: blanco en modo claro, azul marino en modo oscuro */}
    <div className="absolute left-1/2 top-1/2 flex h-[45%] w-[45%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-white shadow-[0_4px_20px_rgba(234,179,8,0.35)] dark:border-[#1c2f55] dark:bg-[#0d1a33] dark:shadow-[0_0_24px_rgba(250,204,21,0.25)]">
      <CloudSun className={clsx('text-amber-500 dark:text-yellow-400', iconClassName)} strokeWidth={2} aria-hidden />
    </div>
  </div>
)

export default PatyLogo
