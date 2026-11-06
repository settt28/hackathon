import type { FC } from 'react'
import { MapPin } from 'lucide-react'
import clsx from 'clsx'

interface Stat {
  value: string
  label: string
  highlight?: boolean
}

interface ZoneSummaryCardProps {
  address: string
  /** Texto del estado de alertas, ej. "Sin alertas activas". */
  alertStatus: string
  stats: Stat[]
}

/** Resumen de la zona: dirección, estado de alertas y 3 cifras clave. */
const ZoneSummaryCard: FC<ZoneSummaryCardProps> = ({ address, alertStatus, stats }) => (
  <section className="mx-4 mt-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-cyan-400/25 dark:bg-[#0b1a26]/80 dark:shadow-none">
    <div className="flex items-start justify-between gap-2">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-sky-200 bg-sky-50 dark:border-cyan-400/30 dark:bg-transparent">
          <MapPin className="h-4 w-4 text-sky-600 dark:text-cyan-300" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-extrabold tracking-[0.16em] text-sky-600 dark:text-cyan-300">TU ZONA</p>
          <p className="text-[13px] font-bold leading-snug text-slate-900 dark:text-white">{address}</p>
        </div>
      </div>
      <span className="mt-1 flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-300">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" aria-hidden />
        {alertStatus}
      </span>
    </div>

    <dl className="mt-3 grid grid-cols-3 gap-2">
      {stats.map((stat) => (
        <div key={stat.label} className="rounded-2xl bg-slate-50 px-2.5 py-2.5 dark:bg-[#08141f]">
          <dt className="sr-only">{stat.label}</dt>
          <dd>
            <span className={clsx('block text-xl font-extrabold leading-tight', stat.highlight ? 'text-amber-500 dark:text-amber-400' : 'text-slate-900 dark:text-white')}>
              {stat.value}
            </span>
            <span className="block text-[10px] leading-snug text-slate-500 dark:text-slate-300">{stat.label}</span>
          </dd>
        </div>
      ))}
    </dl>
  </section>
)

export default ZoneSummaryCard
