import { createElement, type FC } from 'react'
import clsx from 'clsx'
import type { RiskDistrict } from '../../lib/api'
import { formatProbability } from '../../lib/riskGeo'
import { RISK_STYLES, hazardIcon } from './districts'

/** Detalle del distrito seleccionado: nivel, peligro principal, probabilidad del mes y por qué (texto completo). */
const DistrictDetail: FC<{ district: RiskDistrict }> = ({ district }) => {
  const p = district.properties
  const style = RISK_STYLES[p.nivel] ?? RISK_STYLES.moderado

  return (
    <section aria-live="polite" className={clsx('mt-3 rounded-3xl border bg-slate-50 p-4 dark:bg-[#0d1b28]', style.cardBorder)}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="truncate text-lg font-extrabold text-slate-900 dark:text-white">
          {p.nombre}
          {p.esTuDistrito && <span className="ml-2 align-middle text-xs font-semibold text-sky-600 dark:text-cyan-300">(tu distrito)</span>}
        </h3>
        <span className={clsx('shrink-0 rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide', style.badge)}>
          Riesgo {style.label}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-2xl bg-white px-3 py-2.5 dark:bg-[#08131c]">
          <p className="text-[11px] text-slate-500 dark:text-slate-300">Peligro principal</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-base font-bold capitalize text-sky-600 dark:text-sky-300">
            {createElement(hazardIcon(p.peligroPrincipal), { className: 'h-4 w-4 shrink-0', 'aria-hidden': true })}
            <span className="truncate">{p.peligroPrincipal ?? 'Sin registros'}</span>
          </p>
        </div>
        <div className="rounded-2xl bg-white px-3 py-2.5 dark:bg-[#08131c]">
          <p className="text-[11px] text-slate-500 dark:text-slate-300">Probabilidad este mes</p>
          <p className={clsx('mt-0.5 text-base font-extrabold', style.value)}>{formatProbability(p.probabilidadModelo)}</p>
        </div>
      </div>

      {/* Por qué tiene ese nivel: aquí sí hay espacio para el texto completo */}
      {p.razones.length > 0 && (
        <ul className="mt-3 space-y-1.5 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">
          {p.razones.map((r) => (
            <li key={r} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" aria-hidden />
              {r}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default DistrictDetail
