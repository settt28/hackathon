import { createElement, type FC } from 'react'
import clsx from 'clsx'
import { RISK_STYLES, hazardIcon, type District } from './districts'

interface DistrictDetailProps {
  district: District
}

/** Detalle del distrito seleccionado: nivel de riesgo, peligro principal y probabilidad del mes. */
const DistrictDetail: FC<DistrictDetailProps> = ({ district }) => {
  const style = RISK_STYLES[district.risk]

  return (
    <section aria-live="polite" className={clsx('mt-3 rounded-3xl border bg-slate-50 p-4 dark:bg-[#0d1b28]', style.cardBorder)}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="truncate text-lg font-extrabold text-slate-900 dark:text-white">{district.name}</h3>
        <span className={clsx('shrink-0 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide', style.badge)}>
          Riesgo {style.label}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-white px-3 py-2.5 dark:bg-[#08131c]">
          <p className="text-[11px] text-slate-500 dark:text-slate-300">Peligro principal</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-base font-bold text-sky-600 dark:text-sky-300">
            {createElement(hazardIcon(district.hazard), { className: 'h-4 w-4', 'aria-hidden': true })}
            {district.hazard}
          </p>
        </div>
        <div className="rounded-2xl bg-white px-3 py-2.5 dark:bg-[#08131c]">
          <p className="text-[11px] text-slate-500 dark:text-slate-300">Probabilidad este mes</p>
          <p className={clsx('mt-0.5 text-base font-extrabold', style.value)}>{district.probability} %</p>
        </div>
      </div>

      <p className="mt-3 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
        Paty estima {district.probability} % de probabilidad de emergencia este mes en este distrito, según el historial de eventos
        registrados en la zona.
      </p>
    </section>
  )
}

export default DistrictDetail
