import type { FC } from 'react'
import { ChevronRight, Smile } from 'lucide-react'

interface StatusBadgeProps {
  level: number
  onOpenProfile?: () => void
}

/**
 * Avatar de estado con anillos animados, nivel del usuario y saludo.
 * CAMBIOS: el saludo ahora dice solo "Hola" y se eliminó el subtítulo
 * "Monitoreo activo • Perfil al 75% completado" (props `status` y `profileCompletion` ya no se usan).
 */
const StatusBadge: FC<StatusBadgeProps> = ({ level, onOpenProfile }) => (
  <section className="mt-4 flex flex-col items-center">
    <div className="relative flex h-24 w-24 items-center justify-center">
      {/* Anillo punteado exterior + onda pulsante */}
      <span className="absolute inset-0 rounded-full border border-dashed border-emerald-300 dark:border-cyan-400/40" aria-hidden />
      <span className="absolute inset-3 rounded-full border border-emerald-400/50 motion-safe:animate-pulse-ring dark:border-emerald-400/40" aria-hidden />

      {/* Disco central con brillo esmeralda */}
      <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-emerald-400 bg-white shadow-[0_0_20px_rgba(16,185,129,0.25)] dark:border-emerald-400/70 dark:bg-[#0b1a1f] dark:shadow-[0_0_24px_rgba(52,211,153,0.35)]">
        {/* Carita: círculo amarillo con el trazo del ícono encima */}
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.4)] dark:bg-yellow-400 dark:shadow-[0_0_14px_rgba(250,204,21,0.45)]">
          <Smile className="h-9 w-9 text-amber-700 dark:text-[#0b1a1f]" strokeWidth={2.25} aria-hidden />
        </span>
      </div>

      <span className="absolute -bottom-1 rounded-full bg-emerald-500 px-3 py-0.5 text-[10px] font-extrabold tracking-wider text-white shadow-[0_0_12px_rgba(16,185,129,0.4)] dark:bg-emerald-400 dark:text-[#06281d] dark:shadow-[0_0_12px_rgba(52,211,153,0.5)]">
        NIVEL {level}
      </span>
    </div>

    {/* CAMBIO: saludo simplificado */}
    <button
      type="button"
      onClick={onOpenProfile}
      className="mt-3 flex items-center gap-1 rounded-lg px-2 text-[15px] font-bold text-slate-900 transition-colors hover:text-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:text-white dark:hover:text-cyan-200 dark:focus-visible:ring-cyan-400"
    >
      Hola
      <ChevronRight className="h-4 w-4 text-emerald-600 dark:text-cyan-300" strokeWidth={3} aria-hidden />
    </button>
  </section>
)

export default StatusBadge
