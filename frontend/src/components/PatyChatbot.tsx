import { Link } from 'react-router-dom'
import { Sun } from 'lucide-react'

/**
 * Acceso flotante persistente a Paty (se monta en MainLayout, visible en todas las pantallas).
 * Abre la vista de chat a pantalla completa (/paty), como en las apps de mensajería.
 * En móvil se eleva sobre la Bottom Bar; en desktop queda en `bottom-4 right-4`.
 */
export default function PatyChatbot() {
  return (
    <Link
      to="/paty"
      aria-label="Abrir chat con Paty"
      className="fixed bottom-20 right-4 z-50 rounded-full bg-gradient-to-tr from-yellow-400 via-yellow-500 to-sky-400 p-[3px] shadow-lg shadow-slate-900/30 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 active:scale-95 md:bottom-4"
    >
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0d1a33]">
        <Sun className="h-7 w-7 text-yellow-400" aria-hidden />
      </span>
    </Link>
  )
}
