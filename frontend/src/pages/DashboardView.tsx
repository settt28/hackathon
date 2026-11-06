import type { FC } from 'react'
import { useNavigate } from 'react-router-dom'
import DeviceFrame from '../layouts/DeviceFrame'
import Header from '../components/dashboard/Header'
import StatusBadge, { type StatusTone } from '../components/dashboard/StatusBadge'
import MapCard from '../components/dashboard/MapCard'
import HistoryButton from '../components/dashboard/HistoryButton'
import AssistantCard from '../components/dashboard/AssistantCard'
import SOSFooter from '../components/dashboard/SOSFooter'
import PeruSilhouette from '../components/dashboard/PeruSilhouette'
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

  return (
    <DeviceFrame>
      {/* Fondo: leve resplandor cian superior + silueta del Perú detrás del contenido */}
      <main className="relative flex-1 overflow-y-auto overflow-x-hidden bg-[radial-gradient(ellipse_at_50%_0%,rgba(34,211,238,0.08),transparent_55%)] pb-1 pt-4 sm:pt-1">
        <PeruSilhouette />

<div className="relative">
          <Header />
          <StatusBadge {...status} />

          <div className="mt-4 flex flex-col gap-4 px-4 sm:gap-3">
            <MapCard state={risk.state} retry={risk.retry} />
            <HistoryButton onClick={() => navigate('/resumen')} />
            <AssistantCard onOpenChat={() => navigate('/paty')} onVoice={() => navigate('/paty')} />
          </div>

          {/* SOS abre el marcador con Bomberos (116): huaicos, inundaciones y derrumbes */}
          <SOSFooter onPress={() => (window.location.href = 'tel:116')} />
        </div>
      </main>
    </DeviceFrame>
  )
}

export default DashboardView
