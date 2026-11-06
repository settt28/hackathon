import type { FC } from 'react'
import { Moon, Sun } from 'lucide-react'
import clsx from 'clsx'
import { useTheme } from '../../hooks/useTheme'

/** Interruptor de tema claro/oscuro. El cambio se aplica a toda la app y se recuerda entre visitas. */
const ThemeToggle: FC = () => {
  const { isDark, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      onClick={toggleTheme}
      className="flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-sm transition-colors hover:border-orange-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-white/10 dark:bg-[#111c2e] dark:shadow-none dark:hover:border-cyan-400/40 dark:focus-visible:ring-cyan-400"
    >
      {/* Opción activa: sol naranja en modo claro, luna cian en modo oscuro */}
      <span className={clsx('flex h-6 w-6 items-center justify-center rounded-full transition-colors', isDark ? 'text-amber-300' : 'bg-orange-500 text-white')}>
        <Sun className="h-3.5 w-3.5" aria-hidden />
      </span>
      <span className={clsx('flex h-6 w-6 items-center justify-center rounded-full transition-colors', isDark ? 'bg-cyan-400 text-[#070d17]' : 'text-slate-400')}>
        <Moon className="h-3.5 w-3.5" aria-hidden />
      </span>
    </button>
  )
}

export default ThemeToggle
