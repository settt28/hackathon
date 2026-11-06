import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import DashboardView from './pages/DashboardView'
// El modo emergencia (botón SOS) va siempre incluido: debe abrir aunque la señal se caiga en ese momento
import EmergencyView from './pages/EmergencyView'
import RouteErrorBoundary from './components/RouteErrorBoundary'

// Cada módulo se descarga aparte para que el inicio cargue rápido en redes lentas
const loaders = {
  paty: () => import('./pages/PatyChatView'),
  historial: () => import('./pages/HistoryView'),
  resumen: () => import('./pages/Home'),
  salud: () => import('./pages/Salud'),
  agro: () => import('./pages/Agro'),
  infraestructura: () => import('./pages/Infraestructura'),
}
const PatyChatView = lazy(loaders.paty)
const HistoryView = lazy(loaders.historial)
const Home = lazy(loaders.resumen)
const Salud = lazy(loaders.salud)
const Agro = lazy(loaders.agro)
const Infraestructura = lazy(loaders.infraestructura)

/**
 * Con el inicio ya en pantalla y el teléfono libre, descarga el resto de pantallas: abrir el chat o el historial
 * es instantáneo y sigue funcionando si después se pierde la señal. No lo hace con "ahorro de datos" activo.
 */
function usePreloadRoutes() {
  useEffect(() => {
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    if (conn?.saveData) return
    const preload = () => Object.values(loaders).forEach((load) => void load().catch(() => {}))
    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(preload, { timeout: 4000 })
      return () => cancelIdleCallback(id)
    }
    const id = setTimeout(preload, 2000)
    return () => clearTimeout(id)
  }, [])
}

/**
 * Rutas de la aplicación.
 * - "/"     → Dashboard principal PATY SEGURA (pantalla completa, estilo app móvil).
 * - "/paty" → Chat con Paty (pantalla completa).
 * - "/emergencia" → Modo Emergencia (se abre con el botón SOS).
 * - "/historial" → Historial de la Zona & Alertas.
 * - Módulos → dentro de MainLayout (navegación, medidor de red y acceso a Paty).
 */
export default function App() {
  const { pathname } = useLocation()
  usePreloadRoutes()

  return (
    <RouteErrorBoundary resetKey={pathname}>
      <Suspense fallback={<div className="p-6 text-sm text-slate-400">Cargando…</div>}>
        <Routes>
          <Route index element={<DashboardView />} />
          <Route path="paty" element={<PatyChatView />} />
          <Route path="emergencia" element={<EmergencyView />} />
          <Route path="historial" element={<HistoryView />} />
          <Route element={<MainLayout />}>
            <Route path="resumen" element={<Home />} />
            <Route path="salud" element={<Salud />} />
            <Route path="agro" element={<Agro />} />
            <Route path="infraestructura" element={<Infraestructura />} />
          </Route>
        </Routes>
      </Suspense>
    </RouteErrorBoundary>
  )
}
