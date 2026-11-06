import type { FC } from 'react'
import { useNavigate } from 'react-router-dom'
import DeviceFrame from '../layouts/DeviceFrame'
import EmergencyHeader from '../components/emergency/EmergencyHeader'
import EmergencyHero from '../components/emergency/EmergencyHero'
import Call911Banner from '../components/emergency/Call911Banner'
import ServiceCard from '../components/emergency/ServiceCard'
import { EMERGENCY_SERVICES } from '../components/emergency/emergencyServices'

/**
 * Pantalla "Modo Emergencia" (se abre desde el botón SOS del dashboard).
 * Muestra el 911 destacado y las líneas de emergencia del Perú en una grilla de 2 columnas.
 */
const EmergencyView: FC = () => {
  const navigate = useNavigate()

  return (
    <DeviceFrame>
      <main className="flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_50%_0%,rgba(239,68,68,0.06),transparent_55%)] pb-3 pt-4 sm:pt-1">
        <EmergencyHeader onBack={() => navigate('/')} />
        <EmergencyHero />
        <Call911Banner />

        {/* Con un número impar de líneas, la última ocupa todo el ancho */}
        <div className="mx-4 mt-4 grid grid-cols-2 gap-3.5 [&>*:last-child:nth-child(odd)]:col-span-2">
          {EMERGENCY_SERVICES.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>

        <p className="mt-3 px-4 text-center text-[11px] text-slate-500 dark:text-slate-400">
          Usa estas líneas con responsabilidad · Llamadas gratuitas
        </p>
      </main>
    </DeviceFrame>
  )
}

export default EmergencyView
