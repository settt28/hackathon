import { NavLink, Outlet } from 'react-router-dom'
import NetworkMeter from '../components/NetworkMeter'
import PatyChatbot from '../components/PatyChatbot'
import { NAV_ITEMS } from '../components/navItems'

/**
 * Plantilla principal (Dashboard).
 * Mobile-first: en móvil la navegación es una Bottom Bar fija; desde `md` se muestra un Sidebar lateral.
 * El chatbot Paty se monta aquí para estar disponible en todas las pantallas.
 */
export default function MainLayout() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070d17] text-slate-800 dark:text-slate-100 md:flex">
      {/* Sidebar: solo desktop */}
      <aside className="hidden md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col md:border-r md:border-slate-200 md:bg-white dark:md:border-cyan-400/15 dark:md:bg-[#0b1a26]">
        <div className="px-6 py-5 text-lg font-bold text-sky-700 dark:text-cyan-300">El Niño · Preventivo</div>
        <nav className="flex flex-col gap-1 px-3">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? 'bg-sky-50 dark:bg-cyan-400/10 text-sky-700 dark:text-cyan-300' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Cabecera con título y medidor de red */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200 dark:border-cyan-400/15 bg-white/90 dark:bg-[#070d17]/90 px-4 py-3 backdrop-blur md:px-8">
          <h1 className="truncate text-base font-semibold md:text-lg">Sistema Preventivo El Niño</h1>
          <NetworkMeter />
        </header>

        {/* Contenido de la ruta activa. pb-24 deja espacio para la Bottom Bar en móvil */}
        <main className="flex-1 px-4 py-6 pb-24 md:px-8 md:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Bottom Bar: solo móvil */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-slate-200 dark:border-cyan-400/15 bg-white dark:bg-[#0b1a26] md:hidden">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2 text-[11px] font-medium ${
                isActive ? 'text-sky-700 dark:text-cyan-300' : 'text-slate-500 dark:text-slate-400'
              }`
            }
          >
            <Icon className="h-6 w-6" />
            <span className="max-w-full truncate px-1">{label === 'Infraestructura' ? 'Infra' : label}</span>
          </NavLink>
        ))}
      </nav>

      <PatyChatbot />
    </div>
  )
}
