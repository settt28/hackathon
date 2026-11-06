import { useState, type FC } from 'react'
import { useNavigate } from 'react-router-dom'
import DeviceFrame from '../layouts/DeviceFrame'
import Header from '../components/dashboard/Header'
import StatusBadge, { type StatusTone } from '../components/dashboard/StatusBadge'
import MapCard from '../components/dashboard/MapCard'
import HistoryButton from '../components/dashboard/HistoryButton'
import AssistantCard from '../components/dashboard/AssistantCard'
import SOSFooter from '../components/dashboard/SOSFooter'
import PeruSilhouette from '../components/dashboard/PeruSilhouette'
import RiskMapSheet from '../components/riskmap/RiskMapSheet'
import { useRiskMap, type RiskMapState } from '../hooks/useRiskMap'

// Lo que se le dice a la persona según el riesgo REAL de su distrito (mapa de riesgo del backend)
const BY_LEVEL: { zoneLabel: string; message: string; tone: StatusTone }[] = [
  { zoneLabel: 'RIESGO BAJO', message: 'Tu zona está tranquila hoy', tone: 'ok' },
  { zoneLabel: 'RIESGO MODERADO', message: 'Mantente atento a los avisos', tone: 'warn' },
  { zoneLabel: 'RIESGO ALTO', message: 'Ten lista tu mochila de emergencia', tone: 'danger' },
  { zoneLabel: 'RIESGO MUY ALTO', message: 'Conoce tu ruta de evacuación', tone: 'danger' },
]
const LEVELS = ['bajo', 'moderado', 'alto', 'muy alto']

function statusFor(state: RiskMapState): { zoneLabel: string; message: string; tone: StatusTone } {
  if (state.kind === 'loading') return { zoneLabel: 'REVISANDO', message: 'Revisando tu zona…', tone: 'neutral' }
  const mine = state.kind === 'ok' ? state.map.features.find((f) => f.properties.esTuDistrito) : undefined
  if (!mine) return { zoneLabel: 'SIN UBICACIÓN', message: 'Activa tu ubicación para ver tu riesgo', tone: 'neutral' }
  return BY_LEVEL[Math.max(0, LEVELS.indexOf(mine.properties.nivel))]
}

/** Pantalla principal "PATY SEGURA": el estado y el mapa salen del riesgo real de la zona del usuario. */
const DashboardView: FC = () => {
  const navigate = useNavigate()
  const risk = useRiskMap()
  const status = statusFor(risk.state)
  // Pop-up del mapa de riesgo (se abre tocando el mapa del inicio)
  const [riskOpen, setRiskOpen] = useState(false)

  return (
    <DeviceFrame>
      {/* Fondo: leve resplandor cian superior + silueta del Perú detrás del contenido */}
      <main className="relative flex-1 overflow-y-auto overflow-x-hidden bg-[radial-gradient(ellipse_at_50%_0%,rgba(34,211,238,0.08),transparent_55%)] pb-1 pt-4 xl:pt-1">
        <PeruSilhouette />

<div className="relative">
          <Header />

          {/* Tablet: el mapa a la derecha y el resto a la izquierda. La última fila absorbe el alto que sobra. */}
          <div className="tablet:mx-auto tablet:mt-2 tablet:grid tablet:max-w-5xl tablet:grid-cols-2 tablet:grid-rows-[auto_auto_auto_1fr] tablet:gap-x-6 tablet:gap-y-4 tablet:px-6">
            <div className="tablet:col-start-1">
              <StatusBadge {...status} />
            </div>

            <div className="mt-4 flex flex-col gap-4 px-4 xl:gap-3 tablet:contents">
              <div className="tablet:col-start-2 tablet:row-span-4 tablet:row-start-1">
                <MapCard state={risk.state} retry={risk.retry} onExpand={() => setRiskOpen(true)} />
              </div>
              <div className="tablet:col-start-1">
                <HistoryButton onClick={() => navigate('/historial')} />
              </div>
              <div className="tablet:col-start-1">
                <AssistantCard onOpenChat={() => navigate('/paty')} onVoice={() => navigate('/paty', { state: { call: true } })} />
              </div>
            </div>

            {/* Con poca altura el SOS queda fijo en pantalla: este espacio evita que tape lo último al desplazarse */}
            <div className="tablet:col-start-1 short:h-28">
              <SOSFooter onPress={() => navigate('/emergencia')} />
            </div>
          </div>
        </div>
      </main>

      {/* Se dibuja sobre toda la pantalla del teléfono (dentro del marco) */}
      <RiskMapSheet
        open={riskOpen}
        onClose={() => setRiskOpen(false)}
        onViewHistory={() => navigate('/historial')}
        state={risk.state}
        retry={risk.retry}
      />
    </DeviceFrame>
  )
}

export default DashboardView
