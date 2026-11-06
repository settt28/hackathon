import { CloudSun } from 'lucide-react'
import type { FC } from 'react'
import clsx from 'clsx'

// Logo completo: 8 pétalos en sentido horario desde arriba (dorados arriba/izquierda, azules abajo/derecha)
const PETALS_FULL = ['#facc15', '#eab308', '#38bdf8', '#3b82f6', '#0ea5e9', '#60a5fa', '#facc15', '#fde047']
// Logo compacto: 4 pétalos (azules arriba/abajo, dorados a los lados)
const PETALS_COMPACT = ['#38bdf8', '#facc15', '#38bdf8', '#facc15']

interface PatyLogoProps {
  /** 'full' = 8 pétalos con ícono central; 'compact' = 4 pétalos con disco oscuro (para tamaños pequeños). */
  variant?: 'full' | 'compact'
  /** Tamaño del contenedor (clases de Tailwind). Por defecto, el tamaño grande del hero. */
  className?: string
  /** Tamaño del ícono central (solo variante 'full'). */
  iconClassName?: string
  /** Muestra el halo luminoso detrás del logo. */
  glow?: boolean
  /** Color del halo (por defecto, dorado). */
  glowClassName?: string
}

/**
 * Logo "sol/flor tecnológico" de Paty.
 * Solo los pétalos giran (animate-spin-slow); el disco central queda fijo.
 * `motion-safe` respeta la preferencia del sistema de reducir animaciones.
 */
const PatyLogo: FC<PatyLogoProps> = ({
  variant = 'full',
  className = 'h-40 w-40',
  iconClassName = 'h-9 w-9',
  glow = true,
  glowClassName = 'bg-yellow-300/30 dark:bg-yellow-300/20',
}) => {
  const compact = variant === 'compact'
  const petals = compact ? PETALS_COMPACT : PETALS_FULL
  const step = 360 / petals.length

  return (
    <div className={clsx('relative shrink-0', className)} role="img" aria-label="Logo de Paty">
      {glow && <div className={clsx('absolute inset-[15%] rounded-full blur-2xl', glowClassName)} aria-hidden />}

      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full motion-safe:animate-spin-slow" aria-hidden>
        {petals.map((color, i) => (
          <ellipse
            key={i}
            cx="100"
            cy={compact ? 46 : 42}
            rx={compact ? 26 : 19}
            ry={compact ? 36 : 30}
            fill={color}
            transform={`rotate(${i * step} 100 100)`}
          />
        ))}
      </svg>

      {compact ? (
        // Disco central oscuro, sin ícono
        <div className="absolute left-1/2 top-1/2 h-[30%] w-[30%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0b1626]" />
      ) : (
        // Disco central: blanco en modo claro, azul marino en modo oscuro
        <div className="absolute left-1/2 top-1/2 flex h-[45%] w-[45%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-white shadow-[0_4px_20px_rgba(234,179,8,0.35)] dark:border-[#1c2f55] dark:bg-[#0d1a33] dark:shadow-[0_0_24px_rgba(250,204,21,0.25)]">
          <CloudSun className={clsx('text-amber-500 dark:text-yellow-400', iconClassName)} strokeWidth={2} aria-hidden />
        </div>
      )}
    </div>
  )
}

export default PatyLogo
