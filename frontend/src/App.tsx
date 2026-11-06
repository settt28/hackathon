import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import Home from './pages/Home'

// Cada módulo se descarga solo al visitarlo: el inicio carga rápido en redes lentas
const Salud = lazy(() => import('./pages/Salud'))
const Agro = lazy(() => import('./pages/Agro'))
const Infraestructura = lazy(() => import('./pages/Infraestructura'))
const PatyChatView = lazy(() => import('./pages/PatyChatView'))

/**
 * Rutas de la aplicación. Todas las vistas se renderizan dentro de MainLayout,
 * que aporta navegación, cabecera con medidor de red y el chatbot Paty.
 */
export default function App() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-400">Cargando…</div>}>
      <Routes>
        <Route element={<MainLayout />}>
          <Route index element={<Home />} />
          <Route path="salud" element={<Salud />} />
          <Route path="agro" element={<Agro />} />
          <Route path="infraestructura" element={<Infraestructura />} />
        </Route>
        {/* Chat de Paty a pantalla completa, fuera del layout (sin sidebar ni bottom bar) */}
        <Route path="paty" element={<PatyChatView />} />
      </Routes>
    </Suspense>
  )
}
