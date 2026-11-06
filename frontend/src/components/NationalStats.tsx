import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { getEstadisticas, type DamageTotals, type NationalStats as Stats } from '../lib/api'

type Metric = keyof DamageTotals

const METRICS: { id: Metric; label: string }[] = [
  { id: 'eventos', label: 'Emergencias' },
  { id: 'fallecidos', label: 'Fallecidos' },
  { id: 'afectados', label: 'Afectados' },
  { id: 'viviendasDestruidas', label: 'Viviendas destruidas' },
]

const fmt = new Intl.NumberFormat('es-PE')

/** Barra horizontal de una sola serie: etiqueta, barra proporcional y valor (en tinta de texto, no en el color de la barra). */
function HBar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <li className="grid grid-cols-[minmax(0,7.5rem)_1fr_auto] items-center gap-2 text-sm">
      <span className="truncate text-slate-600 dark:text-slate-300" title={label}>
        {label}
      </span>
      <span className="h-2.5 rounded-full bg-slate-100 dark:bg-white/5" aria-hidden>
        <span className="block h-full rounded-full bg-sky-600 dark:bg-cyan-400" style={{ width: `${max ? (value / max) * 100 : 0}%` }} />
      </span>
      <span className="tabular-nums text-slate-700 dark:text-slate-200">{fmt.format(value)}</span>
    </li>
  )
}

/**
 * Emergencias por peligros de El Niño en todo el Perú en los últimos 5 años (INDECI – SINPAD):
 * cifras clave, evolución por año (una métrica a la vez), tipos de peligro y departamentos más afectados.
 */
export default function NationalStats() {
  const [data, setData] = useState<Stats | null>(null)
  const [failed, setFailed] = useState(false)
  const [metric, setMetric] = useState<Metric>('eventos')

  useEffect(() => {
    const ctrl = new AbortController()
    getEstadisticas(5, ctrl.signal)
      .then(setData)
      .catch(() => !ctrl.signal.aborted && setFailed(true))
    return () => ctrl.abort()
  }, [])

  if (failed) return <p className="mt-8 text-sm text-slate-500 dark:text-slate-400">No pudimos cargar las cifras de los últimos años.</p>
  if (!data) return <p className="mt-8 text-sm text-slate-400 dark:text-slate-500">Cargando cifras de los últimos 5 años…</p>

  const years = data.porAnio
  const maxYear = Math.max(...years.map((y) => y.resumen[metric]), 1)
  const partialYear = data.nota ? Number(data.datosHasta?.slice(0, 4)) : null
  const metricLabel = METRICS.find((m) => m.id === metric)!.label.toLowerCase()
  const tile = 'rounded-2xl border border-slate-200 bg-white p-4 dark:border-cyan-400/15 dark:bg-[#0b1a26]'

  return (
    <section className="mt-10" aria-labelledby="stats-title">
      <h2 id="stats-title" className="text-xl font-bold md:text-2xl">
        Últimos 5 años en el Perú
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Emergencias por lluvias intensas, huaicos, inundaciones, deslizamientos y oleaje desde {data.desde}.
      </p>

      {/* Cifras clave */}
      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {METRICS.map((m) => (
          <div key={m.id} className={tile}>
            <p className="text-2xl font-extrabold tabular-nums text-slate-900 dark:text-white">{fmt.format(data.total[m.id])}</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Evolución por año: una métrica a la vez (nunca dos escalas en el mismo eje) */}
      <div className={clsx(tile, 'mt-4')}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">Por año</h3>
          <div role="radiogroup" aria-label="Qué cifra mostrar" className="flex flex-wrap gap-1">
            {METRICS.map((m) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={metric === m.id}
                onClick={() => setMetric(m.id)}
                className={clsx(
                  'rounded-full px-3 py-1 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500',
                  metric === m.id
                    ? 'bg-sky-600 text-white dark:bg-cyan-400 dark:text-[#070d17]'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10',
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <ol className="mt-5 flex h-44 items-end gap-2 border-b border-slate-200 pb-0 dark:border-white/10" aria-label={`${metricLabel} por año`}>
          {years.map((y) => {
            const v = y.resumen[metric]
            const partial = y.anio === partialYear
            return (
              <li key={y.anio} className="group relative flex h-full flex-1 flex-col justify-end">
                {/* Tooltip al pasar el cursor o al enfocar la barra */}
                <span className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-slate-900 px-2 py-1 text-xs text-white opacity-0 shadow transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 dark:bg-white dark:text-slate-900">
                  {y.anio}: {fmt.format(v)} {metricLabel}
                  {partial && ' (parcial)'}
                </span>
                <button
                  type="button"
                  aria-label={`${y.anio}: ${fmt.format(v)} ${metricLabel}${partial ? ', año incompleto' : ''}`}
                  className={clsx(
                    'w-full rounded-t-[4px] transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500',
                    partial
                      ? 'bg-[repeating-linear-gradient(45deg,theme(colors.sky.600)_0_4px,theme(colors.sky.300)_4px_8px)] dark:bg-[repeating-linear-gradient(45deg,theme(colors.cyan.400)_0_4px,theme(colors.cyan.800)_4px_8px)]'
                      : 'bg-sky-600 dark:bg-cyan-400',
                  )}
                  style={{ height: `${Math.max(2, (v / maxYear) * 100)}%` }}
                />
              </li>
            )
          })}
        </ol>
        <ol className="mt-1.5 flex gap-2 text-center text-xs text-slate-500 dark:text-slate-400" aria-hidden>
          {years.map((y) => (
            <li key={y.anio} className="flex-1">
              {y.anio}
              {y.anio === partialYear && '*'}
            </li>
          ))}
        </ol>
        {data.nota && <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">* {data.nota}</p>}

        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-sky-700 dark:text-cyan-300">Ver como tabla</summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-xs tabular-nums">
              <thead className="text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="py-1 pr-3 font-medium">Año</th>
                  {METRICS.map((m) => (
                    <th key={m.id} className="py-1 pr-3 text-right font-medium">
                      {m.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-slate-700 dark:text-slate-200">
                {years.map((y) => (
                  <tr key={y.anio} className="border-t border-slate-100 dark:border-white/5">
                    <td className="py-1 pr-3">
                      {y.anio}
                      {y.anio === partialYear && '*'}
                    </td>
                    {METRICS.map((m) => (
                      <td key={m.id} className="py-1 pr-3 text-right">
                        {fmt.format(y.resumen[m.id])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className={tile}>
          <h3 className="font-semibold">Por tipo de peligro</h3>
          <ul className="mt-3 space-y-2">
            {data.porPeligro.map((p) => (
              <HBar key={p.peligro} label={p.peligro[0].toUpperCase() + p.peligro.slice(1)} value={p.resumen.eventos} max={data.porPeligro[0]?.resumen.eventos ?? 0} />
            ))}
          </ul>
        </div>
        <div className={tile}>
          <h3 className="font-semibold">Departamentos con más emergencias</h3>
          <ul className="mt-3 space-y-2">
            {data.departamentos.slice(0, 6).map((d) => (
              <HBar key={d.departamento} label={d.departamento} value={d.resumen.eventos} max={data.departamentos[0]?.resumen.eventos ?? 0} />
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        Fuente: {data.fuente}. Datos hasta el {data.datosHasta?.split('-').reverse().join('/')}. Las viviendas destruidas de 2026 excluyen
        registros con errores en el archivo oficial.
      </p>
    </section>
  )
}
