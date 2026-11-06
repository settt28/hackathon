import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
// Tipografía Inter empaquetada con la app (funciona sin conexión)
import '@fontsource-variable/inter'
import './index.css'
// Aplica el tema guardado (claro/oscuro) antes del primer render
import './hooks/useTheme'
import { startOfflineSync } from './lib/sync'
import App from './App.tsx'

/**
 * Service worker: deja la app guardada en el teléfono para que abra sin conexión (ver public/sw.js).
 * Solo en producción: en desarrollo serviría código viejo y sería un dolor de cabeza al depurar.
 */
if (import.meta.env.PROD && 'serviceWorker' in navigator)
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => {
      // Sin HTTPS (o en un WebView que lo bloquea) la app sigue funcionando, solo necesita red para abrir
    })
  })

// Descarga el paquete de datos de la zona para que Paty responda sin internet (ver lib/sync.ts)
startOfflineSync()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
