import { Route, Routes } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import DashboardView from './pages/DashboardView'
import Home from './pages/Home'
import Salud from './pages/Salud'
import Agro from './pages/Agro'
import Infraestructura from './pages/Infraestructura'
import PatyChatView from './pages/PatyChatView'
import EmergencyView from './pages/EmergencyView'
import HistoryView from './pages/HistoryView'

/**
 * Rutas de la aplicación.
 * - "/"     → Dashboard principal PATY SEGURA (pantalla completa, estilo app móvil).
 * - "/paty" → Chat con Paty (pantalla completa).
 * - "/emergencia" → Modo Emergencia (se abre con el botón SOS).
 * - "/historial" → Historial de la Zona & Alertas.
 * - Módulos → dentro de MainLayout (navegación, medidor de red y acceso a Paty).
 */
export default function App() {
  return (
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
  )
}
