import { useEffect, useState } from 'react'
import { useAlertas, zonaDeAlerta } from '../hooks/useAlertas'
import { safeUrl } from '../lib/url'
import { getConsejos, type Alert, type AlertLevel, type Dominio, type PreventionTip, type UserLocation } from '../lib/api'

// Clases completas por nivel para que Tailwind las incluya en el build
const LEVEL_STYLES: Record<AlertLevel, { label: string; className: string }> = {
  Bajo: { label: 'Riesgo bajo', className: 'bg-green-100 text-green-800' },
  Medio: { label: 'Riesgo medio', className: 'bg-yellow-100 text-yellow-800' },
  Alto: { label: 'Riesgo alto', className: 'bg-red-100 text-red-700' },
  Critico: { label: 'Riesgo crítico', className: 'bg-red-700 text-white' },
}

const ZONE_LABELS = { distrito: 'Tu distrito', provincia: 'Tu provincia' }

function TipItem({ tip }: { tip: PreventionTip }) {
  return (
    <details className="rounded-xl border border-slate-200 dark:border-cyan-400/15 bg-white dark:bg-[#0b1a26] p-3 text-sm">
      <summary className="cursor-pointer font-medium text-slate-700 dark:text-slate-200">{tip.title}</summary>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-slate-600 dark:text-slate-300">
        {tip.steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
      <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
        Fuente:{' '}
        {safeUrl(tip.sourceUrl) ? (
          <a href={safeUrl(tip.sourceUrl)} target="_blank" rel="noreferrer" className="underline">
            {tip.source}
          </a>
        ) : (
          tip.source
        )}
      </p>
    </details>
  )
}

function AlertCard({ alert, location, tips }: { alert: Alert; location: UserLocation | null; tips: PreventionTip[] }) {
  const [showTips, setShowTips] = useState(false)
  const level = LEVEL_STYLES[alert.level]
  const zona = zonaDeAlerta(alert, location)
  const relatedTips = tips.filter((t) => t.hazard === alert.hazard)

  return (
    <article className="rounded-2xl border border-slate-200 dark:border-cyan-400/15 bg-white dark:bg-[#0b1a26] p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${level.className}`}>{level.label}</span>
        {zona !== 'otra' && (
          <span className="rounded-full bg-sky-100 dark:bg-cyan-400/15 px-2 py-0.5 text-xs font-medium text-sky-800 dark:text-cyan-200">{ZONE_LABELS[zona]}</span>
        )}
      </div>
      <h3 className="mt-2 font-semibold">{alert.title}</h3>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{alert.description}</p>
      <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
        {alert.region} · {alert.source}
      </p>

      {relatedTips.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setShowTips((s) => !s)}
            aria-expanded={showTips}
            className="mt-3 text-sm font-semibold text-sky-700 dark:text-cyan-300 hover:underline"
          >
            {showTips ? 'Ocultar' : 'Qué hacer'}
          </button>
          {showTips && (
            <div className="mt-2 space-y-2">
              {relatedTips.map((tip) => (
                <TipItem key={tip.id} tip={tip} />
              ))}
            </div>
          )}
        </>
      )}
    </article>
  )
}

/** Pantalla de un módulo: alertas vigentes de su dominio y recomendaciones oficiales. */
export default function DomainModule({ title, description, dominio }: { title: string; description: string; dominio: Dominio }) {
  const { deMiZona, otras, location, status, reload } = useAlertas(dominio)
  const [tips, setTips] = useState<PreventionTip[]>([])
  const [tipsFailed, setTipsFailed] = useState(false)

  useEffect(() => {
    const ctrl = new AbortController()
    getConsejos(dominio, ctrl.signal)
      .then(setTips)
      .catch(() => {
        if (!ctrl.signal.aborted) setTipsFailed(true)
      })
    return () => ctrl.abort()
  }, [dominio])

  return (
    <div className="mx-auto max-w-5xl">
      <h2 className="text-xl font-bold md:text-2xl">{title}</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>

      <section className="mt-6" aria-live="polite">
        <h3 className="font-semibold">
          {location ? `Alertas en tu zona · ${location.district}, ${location.department}` : 'Alertas vigentes en el país'}
        </h3>
        {!location && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Activa tu ubicación para ver primero las de tu zona.</p>}

        {status === 'loading' && <p className="mt-3 text-sm text-slate-400 dark:text-slate-500">Cargando alertas…</p>}

        {status === 'error' && (
          <div className="mt-3 rounded-2xl border border-red-200 dark:border-red-400/30 bg-red-50 dark:bg-red-950/40 p-4 text-sm text-red-800 dark:text-red-200">
            <p>No pudimos cargar las alertas. Esto no significa que no haya riesgo.</p>
            <button type="button" onClick={reload} className="mt-2 font-semibold underline">
              Reintentar
            </button>
          </div>
        )}

        {status === 'ok' && (
          <>
            {deMiZona.length === 0 && (
              <p className="mt-3 rounded-2xl border border-slate-200 dark:border-cyan-400/15 bg-white dark:bg-[#0b1a26] p-4 text-sm text-slate-500 dark:text-slate-400">
                No hay alertas vigentes {location ? 'en tu zona' : 'por ahora'}.
              </p>
            )}
            <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
              {deMiZona.map((alert) => (
                <AlertCard key={alert.id} alert={alert} location={location} tips={tips} />
              ))}
            </div>

            {otras.length > 0 && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-slate-600 dark:text-slate-300">Otras regiones ({otras.length})</summary>
                <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {otras.map((alert) => (
                    <AlertCard key={alert.id} alert={alert} location={location} tips={tips} />
                  ))}
                </div>
              </details>
            )}
          </>
        )}
      </section>

      <section className="mt-8">
        <h3 className="font-semibold">Recomendaciones</h3>
        {tipsFailed && <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No pudimos cargar las recomendaciones.</p>}
        <div className="mt-3 space-y-2">
          {tips.map((tip) => (
            <TipItem key={tip.id} tip={tip} />
          ))}
        </div>
      </section>
    </div>
  )
}
