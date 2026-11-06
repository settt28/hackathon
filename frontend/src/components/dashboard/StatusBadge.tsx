import type { FC } from 'react'
import clsx from 'clsx'

export type StatusTone = 'ok' | 'warn' | 'danger' | 'neutral'

interface StatusBadgeProps {
  /** Etiqueta bajo el avatar, ej. "RIESGO BAJO". */
  zoneLabel: string
  /** Mensaje principal de estado. */
  message: string
  /** Color y gesto del avatar: solo "ok" sonríe; nunca se muestra calma sin datos que la respalden. */
  tone: StatusTone
}

// Clases completas por tono para que Tailwind las incluya en el build
const TONES: Record<StatusTone, { ring: string; pulse: string; disc: string; badge: string; mouth: string }> = {
  ok: {
    ring: 'border-emerald-300 dark:border-cyan-400/35',
    pulse: 'border-emerald-400/50 dark:border-emerald-400/40',
    disc: 'border-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.3)] dark:bg-[#0b1f1c] dark:shadow-[0_0_28px_rgba(52,211,153,0.35)]',
    badge: 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-400 dark:bg-[#0b2a22] dark:text-emerald-200',
    mouth: 'M15.5 29 Q26 40 36.5 29',
  },
  warn: {
    ring: 'border-amber-300 dark:border-amber-400/40',
    pulse: 'border-amber-400/60 dark:border-amber-400/50',
    disc: 'border-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.3)] dark:bg-[#1f1a0b] dark:shadow-[0_0_28px_rgba(251,191,36,0.35)]',
    badge: 'border-amber-500 bg-amber-50 text-amber-800 dark:border-amber-400 dark:bg-[#2a220b] dark:text-amber-200',
    mouth: 'M16.5 32 L35.5 32',
  },
  danger: {
    ring: 'border-red-300 dark:border-red-400/40',
    pulse: 'border-red-400/60 dark:border-red-400/50',
    disc: 'border-red-500 shadow-[0_0_24px_rgba(239,68,68,0.35)] dark:bg-[#1f0b0e] dark:shadow-[0_0_28px_rgba(248,113,113,0.4)]',
    badge: 'border-red-500 bg-red-50 text-red-700 dark:border-red-400 dark:bg-[#2a0b10] dark:text-red-200',
    mouth: 'M16.5 35 Q26 27 35.5 35',
  },
  neutral: {
    ring: 'border-slate-300 dark:border-white/20',
    pulse: 'border-slate-300/60 dark:border-white/15',
    disc: 'border-slate-300 dark:border-white/30 dark:bg-[#111826]',
    badge: 'border-slate-300 bg-slate-50 text-slate-600 dark:border-white/25 dark:bg-white/5 dark:text-slate-300',
    mouth: 'M16.5 32 L35.5 32',
  },
}

/** Avatar de estado con anillos animados, etiqueta de riesgo de la zona y mensaje. */
const StatusBadge: FC<StatusBadgeProps> = ({ zoneLabel, message, tone }) => {
  const t = TONES[tone]
  return (
    <section className="mt-3 flex flex-col items-center" aria-live="polite">
      <div className="relative flex h-[120px] w-[120px] items-center justify-center @5xl:h-[160px] @5xl:w-[160px]">
        {/* Anillo punteado exterior + onda pulsante */}
        <span className={clsx('absolute inset-0 rounded-full border border-dashed', t.ring)} aria-hidden />
        <span className={clsx('absolute inset-5 rounded-full border motion-safe:animate-pulse-ring', t.pulse)} aria-hidden />

        {/* Disco central con borde grueso y brillo del color del riesgo */}
        <div className={clsx('relative flex h-20 w-20 items-center justify-center rounded-full border-4 bg-white @5xl:h-28 @5xl:w-28', t.disc)}>
          <svg viewBox="0 0 52 52" className="h-[52px] w-[52px] @5xl:h-[72px] @5xl:w-[72px]" aria-hidden>
            <circle cx="26" cy="26" r="26" className="fill-amber-300 dark:fill-yellow-400" />
            <g className="fill-amber-800 stroke-amber-800 dark:fill-[#0b1f1c] dark:stroke-[#0b1f1c]">
              <ellipse cx="18.5" cy="20" rx="2.6" ry="3.4" stroke="none" />
              <ellipse cx="33.5" cy="20" rx="2.6" ry="3.4" stroke="none" />
              <path d={t.mouth} fill="none" strokeWidth="3.4" strokeLinecap="round" />
            </g>
          </svg>
        </div>

        <span className={clsx('absolute -bottom-3 whitespace-nowrap rounded-full border px-5 py-1 text-xs font-extrabold tracking-[0.14em] @5xl:-bottom-4 @5xl:px-6 @5xl:py-1.5 @5xl:text-sm', t.badge)}>
          {zoneLabel}
        </span>
      </div>

      <h2 className="mt-5 px-4 text-center text-xl font-extrabold text-slate-900 dark:text-white @5xl:mt-8 @5xl:text-3xl">{message}</h2>
    </section>
  )
}

export default StatusBadge
