import type { FC } from 'react'
import ConnectionChip from './ConnectionChip'
import ThemeToggle from './ThemeToggle'

/**
 * Cabecera de marca.
 * CAMBIOS: se eliminó el escudo con resplandor; se añadió el chip de conexión a la izquierda.
 * Ahora es una fila superior (conexión ↔ tema) y debajo el título "PATY SEGURA" centrado.
 */
const Header: FC = () => (
  <header className="flex flex-col items-center px-5 pt-2">
    {/* Fila superior: conexión (izquierda) y tema (derecha) */}
    <div className="flex w-full items-center justify-between">
      <ConnectionChip />
      <ThemeToggle />
    </div>

    <p className="mt-4 flex items-center gap-2 text-sm font-extrabold tracking-[0.18em] text-slate-800 dark:text-cyan-300">
      PATY SEGURA
      {/* Indicadores de servicio activo */}
      <span className="flex gap-1" aria-label="Servicio activo">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse dark:bg-emerald-400" />
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse [animation-delay:300ms] dark:bg-emerald-400" />
      </span>
    </p>
  </header>
)

export default Header
