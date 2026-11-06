import type { FC } from 'react'
import { Plus, X } from 'lucide-react'
import clsx from 'clsx'
import type { HistoryEvent } from './historyEvents'

interface TimelineItemProps {
  event: HistoryEvent
  open: boolean
  onToggle: () => void
}

/**
 * Evento de la línea de tiempo (acordeón).
 * Cerrado: año, ícono, título y etiqueta. Abierto: además la descripción y los datos de lugar/año.
 */
const TimelineItem: FC<TimelineItemProps> = ({ event, open, onToggle }) => {
  const Icon = event.icon
  const panelId = `evento-${event.id}`

  return (
    <li className="relative pl-7">
      {/* Punto de la línea de tiempo: ámbar si está abierto, cian si no */}
      <span
        className={clsx(
          'absolute left-[3px] top-[18px] h-[18px] w-[18px] rounded-full border-[3px] border-[#f4f7fb] dark:border-[#070d17]',
          open ? 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.6)]' : 'bg-cyan-500 dark:bg-cyan-400',
        )}
        aria-hidden
      />

      <div
        className={clsx(
          'rounded-3xl border bg-white shadow-sm transition-colors dark:bg-[#0b1622] dark:shadow-none',
          open ? 'border-amber-400 dark:border-amber-400/60' : 'border-slate-200 dark:border-white/10',
        )}
      >
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full items-center gap-2 rounded-3xl px-3 py-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:focus-visible:ring-cyan-400"
        >
          <span className="shrink-0 text-[13px] font-bold tabular-nums text-amber-500 dark:text-amber-400">{event.year}</span>
          <Icon className={clsx('h-4 w-4 shrink-0', event.iconClassName)} aria-hidden />
          <span className="min-w-0 flex-1 truncate text-[14px] font-bold text-slate-900 dark:text-white">{event.title}</span>
          <span className={clsx('shrink-0 rounded-md border px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide', event.tagClassName)}>
            {event.tag}
          </span>
          {open ? (
            <X className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-300" aria-hidden />
          ) : (
            <Plus className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-300" aria-hidden />
          )}
        </button>

        {open && (
          <div id={panelId} className="px-3.5 pb-3.5">
            <p className="rounded-2xl bg-slate-50 px-3.5 py-3 text-[13px] leading-relaxed text-slate-700 dark:bg-[#08131c] dark:text-slate-200">
              {event.description}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {[event.region, `Año ${event.year}`].map((chip) => (
                <span key={chip} className="rounded-full border border-slate-200 px-2.5 py-0.5 text-[11px] text-slate-600 dark:border-white/15 dark:text-slate-300">
                  {chip}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </li>
  )
}

export default TimelineItem
