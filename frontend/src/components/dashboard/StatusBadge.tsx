import type { FC } from 'react'

interface StatusBadgeProps {
  /** Etiqueta bajo el avatar, ej. "ZONA SEGURA". */
  zoneLabel: string
  /** Mensaje principal de estado, ej. "¡Te encuentras protegido!". */
  message: string
}

/** Avatar de estado con anillos animados, etiqueta de zona y mensaje de protección. */
const StatusBadge: FC<StatusBadgeProps> = ({ zoneLabel, message }) => (
  <section className="mt-3 flex flex-col items-center">
    <div className="relative flex h-[120px] w-[120px] items-center justify-center">
      {/* Anillo punteado exterior + onda pulsante */}
      <span className="absolute inset-0 rounded-full border border-dashed border-emerald-300 dark:border-cyan-400/35" aria-hidden />
      <span className="absolute inset-5 rounded-full border border-emerald-400/50 motion-safe:animate-pulse-ring dark:border-emerald-400/40" aria-hidden />

      {/* Disco central con borde esmeralda grueso y brillo */}
      <div className="relative flex h-20 w-20 items-center justify-center rounded-full border-4 border-emerald-400 bg-white shadow-[0_0_24px_rgba(16,185,129,0.3)] dark:bg-[#0b1f1c] dark:shadow-[0_0_28px_rgba(52,211,153,0.35)]">
        {/* Carita: círculo amarillo sólido con ojos y sonrisa (sin aro interior) */}
        <svg viewBox="0 0 52 52" className="h-[52px] w-[52px]" aria-hidden>
          <circle cx="26" cy="26" r="26" className="fill-amber-300 dark:fill-yellow-400" />
          <g className="fill-amber-800 stroke-amber-800 dark:fill-[#0b1f1c] dark:stroke-[#0b1f1c]">
            <ellipse cx="18.5" cy="20" rx="2.6" ry="3.4" stroke="none" />
            <ellipse cx="33.5" cy="20" rx="2.6" ry="3.4" stroke="none" />
            <path d="M15.5 29 Q26 40 36.5 29" fill="none" strokeWidth="3.4" strokeLinecap="round" />
          </g>
        </svg>
      </div>

      <span className="absolute -bottom-3 whitespace-nowrap rounded-full border border-emerald-500 bg-emerald-50 px-5 py-1 text-xs font-extrabold tracking-[0.14em] text-emerald-700 dark:border-emerald-400 dark:bg-[#0b2a22] dark:text-emerald-200">
        {zoneLabel}
      </span>
    </div>

    <h2 className="mt-5 text-xl font-extrabold text-slate-900 dark:text-white">{message}</h2>
  </section>
)

export default StatusBadge
