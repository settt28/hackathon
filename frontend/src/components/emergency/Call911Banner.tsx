import type { FC } from 'react'
import { Phone } from 'lucide-react'

/** Acceso principal: llamada directa a la Central Única de Emergencias 911 (enlace `tel:`). */
const Call911Banner: FC = () => (
  <a
    href="tel:911"
    aria-label="Llamar al 911, Central Única de Emergencias"
    className="mx-4 mt-4 flex items-center gap-4 rounded-3xl border-2 border-red-300/70 bg-gradient-to-r from-red-500 to-red-700 px-4 py-2.5 text-white shadow-[0_8px_30px_rgba(239,68,68,0.35)] transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-300 active:scale-[0.98]"
  >
    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white">
      <Phone className="h-5 w-5 text-red-600" strokeWidth={2.5} aria-hidden />
    </span>
    <span className="min-w-0">
      <span className="block text-[10px] font-extrabold tracking-[0.18em] text-red-100">CENTRAL ÚNICA DE EMERGENCIAS</span>
      <span className="block text-[26px] font-extrabold leading-tight tracking-tight">Llamar al 911</span>
      <span className="block text-[11px] text-red-50/90">En marcha en Lima Metropolitana y Callao</span>
    </span>
  </a>
)

export default Call911Banner
