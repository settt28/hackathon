import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
// Tipografía Inter empaquetada con la app (funciona sin conexión): solo el set latino, ver index.css
import './index.css'
// Aplica el tema guardado (claro/oscuro) antes del primer render
import './hooks/useTheme'
import { Capacitor } from '@capacitor/core'
import { preloadOfflineData } from './lib/paty/client'
import App from './App.tsx'

/**
 * Service worker: deja la app guardada en el navegador para que abra sin conexión (ver public/sw.js).
 * Solo en producción: en desarrollo serviría código viejo y sería un dolor de cabeza al depurar.
 * En el APK no hace falta: Capacitor ya sirve los archivos desde el propio teléfono.
 */
if (import.meta.env.PROD && !Capacitor.isNativePlatform() && 'serviceWorker' in navigator)
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => {
      // Sin HTTPS (o en un WebView que lo bloquea) la app sigue funcionando, solo necesita red para abrir
    })
  })

// Distritos y postas para que Paty responda sin internet (ver lib/paty/client.ts).
// Se piden ya, no al abrir el chat: en una emergencia no hay tiempo de esperar la descarga.
void preloadOfflineData()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
