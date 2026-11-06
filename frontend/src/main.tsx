import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
// Tipografía Inter empaquetada con la app (funciona sin conexión)
import '@fontsource-variable/inter'
import './index.css'
// Aplica el tema guardado (claro/oscuro) antes del primer render
import './hooks/useTheme'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
