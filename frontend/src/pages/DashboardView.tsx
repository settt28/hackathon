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
      <main className="relative flex-1 overflow-y-auto overflow-x-hidden bg-[radial-gradient(ellipse_at_50%_0%,rgba(34,211,238,0.08),transparent_55%)] pb-1 pt-4 @3xl:pt-6 sm:group-data-[framed=true]/frame:pt-1">
        <PeruSilhouette />

        <div className="relative mx-auto w-full max-w-[110rem] @3xl:flex @3xl:min-h-full @3xl:flex-col">
          <Header />

          {/*
            Móvil: una columna (estado → mapa → historial → Paty → SOS).
            Tablet/PC (@3xl): la grilla ocupa todo el alto disponible. A la derecha, el mapa lo llena;
            a la izquierda, estado, accesos y SOS centrados verticalmente frente a él (filas 1fr arriba y abajo).
          */}
          <div className="@3xl:grid @3xl:flex-1 @3xl:grid-cols-2 @3xl:grid-rows-[1fr_auto_auto_auto_1fr] @3xl:gap-x-8 @3xl:px-8 @3xl:pb-6 @5xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] @5xl:gap-x-12 @5xl:px-10">
            <div className="@3xl:col-start-1 @3xl:row-start-2">
              <StatusBadge {...status} />
            </div>

            <div className="mt-4 px-4 @3xl:col-start-2 @3xl:row-span-5 @3xl:row-start-1 @3xl:flex @3xl:flex-col @3xl:justify-center @3xl:px-0">
              <MapCard state={risk.state} retry={risk.retry} onExpand={() => setRiskOpen(true)} />
            </div>

            <div className="mt-4 flex flex-col gap-4 px-4 sm:mt-3 sm:gap-3 @3xl:col-start-1 @3xl:row-start-3 @3xl:mt-8 @3xl:gap-4 @3xl:px-0 @5xl:mt-10 @5xl:gap-5">
              <HistoryButton onClick={() => navigate('/historial')} />
              <AssistantCard onOpenChat={() => navigate('/paty')} onVoice={() => navigate('/paty', { state: { call: true } })} />
            </div>

            <div className="@3xl:col-start-1 @3xl:row-start-4">
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
