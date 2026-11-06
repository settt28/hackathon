import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import DashboardView from './pages/DashboardView'

// Cada módulo se descarga solo al visitarlo: el inicio carga rápido en redes lentas
const Home = lazy(() => import('./pages/Home'))
const Salud = lazy(() => import('./pages/Salud'))
const Agro = lazy(() => import('./pages/Agro'))
const Infraestructura = lazy(() => import('./pages/Infraestructura'))
const PatyChatView = lazy(() => import('./pages/PatyChatView'))

/**
 * Rutas de la aplicación.
 * - "/"     → Dashboard principal PATY SEGURA (pantalla completa, estilo app móvil).
 * - "/paty" → Chat con Paty (pantalla completa).
 * - Módulos → dentro de MainLayout (navegación, medidor de red y acceso a Paty).
 */
export default function App() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-400">Cargando…</div>}>
      <Routes>
        <Route index element={<DashboardView />} />
        <Route path="paty" element={<PatyChatView />} />
        <Route element={<MainLayout />}>
          <Route path="resumen" element={<Home />} />
          <Route path="salud" element={<Salud />} />
          <Route path="agro" element={<Agro />} />
          <Route path="infraestructura" element={<Infraestructura />} />
        </Route>
      </Routes>
    </Suspense>
  )
}
