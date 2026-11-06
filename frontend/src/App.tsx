import { Route, Routes } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import Home from './pages/Home'
import Salud from './pages/Salud'
import Agro from './pages/Agro'
import Infraestructura from './pages/Infraestructura'
import PatyChatView from './pages/PatyChatView'

/**
 * Rutas de la aplicación. Todas las vistas se renderizan dentro de MainLayout,
 * que aporta navegación, cabecera con medidor de red y el chatbot Paty.
 */
export default function App() {
  return (
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
  )
}
