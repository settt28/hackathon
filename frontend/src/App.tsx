import { Route, Routes } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import DashboardView from './pages/DashboardView'
import Home from './pages/Home'
import Salud from './pages/Salud'
import Agro from './pages/Agro'
import Infraestructura from './pages/Infraestructura'
import PatyChatView from './pages/PatyChatView'

/**
 * Rutas de la aplicación.
 * - "/"     → Dashboard principal PATY SEGURA (pantalla completa, estilo app móvil).
 * - "/paty" → Chat con Paty (pantalla completa).
 * - Módulos → dentro de MainLayout (navegación, medidor de red y acceso a Paty).
 */
export default function App() {
  return (
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
  )
}
