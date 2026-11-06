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
      <main className="flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_50%_0%,rgba(239,68,68,0.06),transparent_55%)] pb-3 pt-4 @3xl:pt-6 sm:group-data-[framed=true]/frame:pt-1">
        <div className="mx-auto w-full max-w-[110rem] @3xl:flex @3xl:min-h-full @3xl:flex-col @3xl:px-4 @5xl:px-6">
          <EmergencyHeader onBack={() => navigate('/')} />

          {/* Tablet/PC: el contenido se centra en el alto disponible; la pregunta y el 911 lado a lado, a la misma altura */}
          <div className="@3xl:my-auto @3xl:py-6">
            <div className="@3xl:mx-4 @3xl:mt-4 @3xl:grid @3xl:grid-cols-2 @3xl:gap-4 @6xl:gap-6">
              <EmergencyHero />
              <Call911Banner />
            </div>

            {/* Móvil: 2 columnas y, con un número impar de líneas, la última ocupa todo el ancho. Tablet: 3. PC: todas en una fila */}
            <div className="mx-4 mt-4 grid grid-cols-2 gap-3.5 [&>*:last-child:nth-child(odd)]:col-span-2 @3xl:grid-cols-3 @3xl:gap-4 @3xl:[&>*:last-child:nth-child(odd)]:col-span-1 @5xl:grid-cols-5 @6xl:mt-6 @6xl:gap-6">
              {EMERGENCY_SERVICES.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>

            <p className="mt-3 px-4 text-center text-[11px] text-slate-500 dark:text-slate-400 @3xl:mt-5 @3xl:text-xs @6xl:mt-8 @6xl:text-sm">
              Usa estas líneas con responsabilidad · Llamadas gratuitas
            </p>
          </div>
        </div>
      </main>
    </DeviceFrame>
  )
}

export default EmergencyView
