import type { FC } from 'react'
import { useNavigate } from 'react-router-dom'
import DeviceFrame from '../layouts/DeviceFrame'
import Header from '../components/dashboard/Header'
import StatusBadge from '../components/dashboard/StatusBadge'
import MapCard from '../components/dashboard/MapCard'
import HistoryButton from '../components/dashboard/HistoryButton'
import AssistantCard from '../components/dashboard/AssistantCard'
import SOSFooter from '../components/dashboard/SOSFooter'

/**
 * Pantalla principal "PATY SEGURA".
 * Los datos son mock; cuando exista backend, se reemplazan por estado/props sin tocar los componentes.
 */
const DashboardView: FC = () => {
  const navigate = useNavigate()

  return (
    <DeviceFrame>
      {/* Fondo con leve resplandor cian en la parte superior */}
      <main className="flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_50%_0%,rgba(34,211,238,0.08),transparent_55%)] pb-1 pt-4 sm:pt-0">
        <Header />
        <StatusBadge level={3} />

        <div className="mt-4 flex flex-col gap-3 px-4">
          <MapCard address="Av. Paseo de la Reforma 222" gpsLabel="GPS Óptimo" />
          <HistoryButton onClick={() => navigate('/resumen')} />
          <AssistantCard onOpenChat={() => navigate('/paty')} onVoice={() => navigate('/paty')} />
        </div>

        {/* SOS abre el marcador con Bomberos (116): huaicos, inundaciones y derrumbes */}
        <SOSFooter onPress={() => (window.location.href = 'tel:116')} />
      </main>
    </DeviceFrame>
  )
}

export default DashboardView
