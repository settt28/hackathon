import { useEffect, useMemo, useState, type FC } from 'react'
import { useNavigate } from 'react-router-dom'
import DeviceFrame from '../layouts/DeviceFrame'
import HistoryHeader from '../components/history/HistoryHeader'
import ZoneSummaryCard from '../components/history/ZoneSummaryCard'
import FilterChips from '../components/history/FilterChips'
import TimelineItem from '../components/history/TimelineItem'
import { FILTERS, toHistoryEvent, type EventCategory, type HistoryEvent } from '../components/history/historyEvents'
import { getActiveAlerts, getZoneHistory } from '../lib/api'
import { getPosition } from '../lib/geo'

type Filter = EventCategory | 'todos'

type State =
  | { kind: 'loading' }
  | { kind: 'no-gps' }
  | { kind: 'error'; message: string }
  | { kind: 'ok'; place: string; coverage: string; alerts: number; events: HistoryEvent[] }

/** Historial real del distrito donde está la persona (INDECI – SINPAD) y sus alertas vigentes. */
function useZoneHistory() {
  const [state, setState] = useState<State>({ kind: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const ctrl = new AbortController()
    void (async () => {
      const pos = await getPosition()
      if (ctrl.signal.aborted) return
      if (!pos) return setState({ kind: 'no-gps' })
      try {
        const { ubicacion, historial } = await getZoneHistory(pos.latitude, pos.longitude, ctrl.signal)
        const alerts = await getActiveAlerts(ubicacion.ubigeo, ctrl.signal).catch(() => [])
        setState({
          kind: 'ok',
          place: `${ubicacion.district}, ${ubicacion.department}`,
          coverage: historial.coverage,
          alerts: alerts.length,
          events: historial.events.map(toHistoryEvent),
        })
      } catch (e) {
        if (!ctrl.signal.aborted) setState({ kind: 'error', message: (e as Error).message })
      }
    })()
    return () => ctrl.abort()
  }, [attempt])

  const retry = () => {
    setState({ kind: 'loading' })
    setAttempt((a) => a + 1)
  }
  return { state, retry }
}

/**
 * Pantalla "Historial de la Zona & Alertas" (se abre desde el dashboard).
 * Resumen de la zona + línea de tiempo filtrable; un solo evento abierto a la vez.
 */
const HistoryView: FC = () => {
  const navigate = useNavigate()
  const { state, retry } = useZoneHistory()
  const [filter, setFilter] = useState<Filter>('todos')
  const [openId, setOpenId] = useState<string | null>(null)

  const all = useMemo(() => (state.kind === 'ok' ? state.events : []), [state])
  const events = filter === 'todos' ? all : all.filter((e) => e.category === filter)
  // Solo los filtros que tienen eventos (el historial del INDECI no incluye sismos)
  const filters = FILTERS.filter((f) => f.id === 'todos' || all.some((e) => e.category === f.id))

  const years = all.map((e) => e.year)
  const stats =
    all.length === 0
      ? []
      : [
          { value: String(all.length), label: 'Eventos registrados' },
          { value: `${Math.max(...years) - Math.min(...years) + 1} años`, label: `${Math.min(...years)} – ${Math.max(...years)}` },
          { value: String(all.filter((e) => e.category === 'clima').length), label: 'De origen climático', highlight: true },
        ]

  return (
    <DeviceFrame>
      <main className="flex-1 overflow-y-auto pb-4 pt-4 sm:pt-1">
        <HistoryHeader onBack={() => navigate('/')} />

        {state.kind === 'ok' ? (
          <>
            <ZoneSummaryCard
              address={state.place}
              alertStatus={state.alerts === 0 ? 'Sin alertas activas' : `${state.alerts} alerta${state.alerts > 1 ? 's' : ''} activa${state.alerts > 1 ? 's' : ''}`}
              hasAlerts={state.alerts > 0}
              stats={stats}
            />
            <p className="mx-4 mt-2 text-[11px] text-slate-500 dark:text-slate-400">{state.coverage}</p>

            <h2 className="mt-5 px-4 text-[11px] font-extrabold tracking-[0.18em] text-sky-600 dark:text-cyan-300">REGISTRO HISTÓRICO</h2>
            {all.length > 0 && <FilterChips options={filters} value={filter} onChange={setFilter} />}

            {all.length === 0 ? (
              <p className="mx-4 mt-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-cyan-400/20 dark:bg-[#0b1a26] dark:text-slate-300">
                No hay emergencias registradas en tu distrito. Eso no significa que sea una zona segura.
              </p>
            ) : (
              /* Línea de tiempo: la línea vertical une los puntos de cada evento */
              <ol className="relative ml-2 mr-4 mt-3 flex flex-col gap-2.5">
                <span className="absolute bottom-6 left-[11px] top-6 w-0.5 bg-cyan-500/40 dark:bg-cyan-700/60" aria-hidden />
                {events.map((event) => (
                  <TimelineItem
                    key={event.id}
                    event={event}
                    open={openId === event.id}
                    onToggle={() => setOpenId((id) => (id === event.id ? null : event.id))}
                  />
                ))}
              </ol>
            )}
          </>
        ) : (
          <div className="mx-4 mt-8 flex flex-col items-center gap-3 text-center text-sm text-slate-600 dark:text-slate-300">
            {state.kind === 'loading' && <p>Cargando el historial de tu zona…</p>}
            {state.kind === 'no-gps' && <p>Activa tu ubicación para ver el historial de emergencias de tu distrito.</p>}
            {state.kind === 'error' && <p>No pudimos cargar el historial. {state.message}</p>}
            {state.kind !== 'loading' && (
              <button type="button" onClick={retry} className="rounded-full border border-sky-200 bg-white px-4 py-2 font-semibold text-sky-700 dark:border-cyan-400/40 dark:bg-[#0d1828] dark:text-cyan-200">
                Reintentar
              </button>
            )}
          </div>
        )}
      </main>
    </DeviceFrame>
  )
}

export default HistoryView
