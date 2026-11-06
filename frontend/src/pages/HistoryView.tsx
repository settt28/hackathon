import { useMemo, useState, type FC } from 'react'
import { useNavigate } from 'react-router-dom'
import DeviceFrame from '../layouts/DeviceFrame'
import HistoryHeader from '../components/history/HistoryHeader'
import ZoneSummaryCard from '../components/history/ZoneSummaryCard'
import FilterChips from '../components/history/FilterChips'
import TimelineItem from '../components/history/TimelineItem'
import { FILTERS, HISTORY_EVENTS, type EventCategory } from '../components/history/historyEvents'

type Filter = EventCategory | 'todos'

/**
 * Pantalla "Historial de la Zona & Alertas" (se abre desde el dashboard).
 * Resumen de la zona + línea de tiempo filtrable; un solo evento abierto a la vez.
 */
const HistoryView: FC = () => {
  const navigate = useNavigate()
  const [filter, setFilter] = useState<Filter>('todos')
  const [openId, setOpenId] = useState<string | null>(HISTORY_EVENTS[0]?.id ?? null)

  const events = useMemo(
    () => (filter === 'todos' ? HISTORY_EVENTS : HISTORY_EVENTS.filter((e) => e.category === filter)),
    [filter],
  )

  // Cifras del resumen calculadas a partir de los datos
  const years = HISTORY_EVENTS.map((e) => e.year)
  const minYear = Math.min(...years)
  const maxYear = Math.max(...years)
  const stats = [
    { value: String(HISTORY_EVENTS.length), label: 'Eventos registrados' },
    { value: `${maxYear - minYear + 1} años`, label: `${minYear} – ${maxYear}` },
    { value: String(HISTORY_EVENTS.filter((e) => e.category === 'clima').length), label: 'De origen climático', highlight: true },
  ]

  return (
    <DeviceFrame>
      <main className="flex-1 overflow-y-auto pb-4 pt-4 sm:pt-1">
        <HistoryHeader onBack={() => navigate('/')} />
        <ZoneSummaryCard address="Av. Paseo de la Reforma 222" alertStatus="Sin alertas activas" stats={stats} />

        <h2 className="mt-5 px-4 text-[11px] font-extrabold tracking-[0.18em] text-sky-600 dark:text-cyan-300">REGISTRO HISTÓRICO</h2>
        <FilterChips options={FILTERS} value={filter} onChange={setFilter} />

        {/* Línea de tiempo: la línea vertical une los puntos de cada evento */}
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
      </main>
    </DeviceFrame>
  )
}

export default HistoryView
