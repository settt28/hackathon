import { useState, type FC } from 'react'
import { useNavigate } from 'react-router-dom'
import DeviceFrame from '../layouts/DeviceFrame'
import Header from '../components/dashboard/Header'
import StatusBadge from '../components/dashboard/StatusBadge'
import MapCard from '../components/dashboard/MapCard'
import HistoryButton from '../components/dashboard/HistoryButton'
import AssistantCard from '../components/dashboard/AssistantCard'
import SOSFooter from '../components/dashboard/SOSFooter'
import PeruSilhouette from '../components/dashboard/PeruSilhouette'
import RiskMapSheet from '../components/riskmap/RiskMapSheet'

/**
 * Pantalla principal "PATY SEGURA".
 * Los datos son mock; cuando exista backend, se reemplazan por estado/props sin tocar los componentes.
 */
const DashboardView: FC = () => {
  const navigate = useNavigate()
  // Pop-up del mapa de riesgo
  const [riskOpen, setRiskOpen] = useState(false)

  return (
    <DeviceFrame>
      {/* Fondo: leve resplandor cian superior + silueta del Perú detrás del contenido */}
      <main className="relative flex-1 overflow-y-auto overflow-x-hidden bg-[radial-gradient(ellipse_at_50%_0%,rgba(34,211,238,0.08),transparent_55%)] pb-1 pt-4 sm:pt-1">
        <PeruSilhouette />

        <div className="relative">
          <Header />
          <StatusBadge zoneLabel="ZONA SEGURA" message="¡Te encuentras protegido!" />

          <div className="mt-4 flex flex-col gap-4 px-4 sm:gap-3">
            <MapCard address="Av. Paseo de la Reforma 222" gpsLabel="GPS Óptimo" onExpand={() => setRiskOpen(true)} />
            <HistoryButton onClick={() => navigate('/historial')} />
            <AssistantCard onOpenChat={() => navigate('/paty')} onVoice={() => navigate('/paty')} />
          </div>

          <SOSFooter onPress={() => navigate('/emergencia')} />
        </div>
      </main>

      {/* Se dibuja sobre toda la pantalla del teléfono (dentro del marco) */}
      <RiskMapSheet
        open={riskOpen}
        onClose={() => setRiskOpen(false)}
        onViewHistory={() => navigate('/historial')}
        zoneName="San Luis, Lima"
      />
    </DeviceFrame>
  )
}

export default DashboardView
