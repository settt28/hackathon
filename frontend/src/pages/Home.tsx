import type { ComponentType, ReactNode } from 'react'
import NationalStats from '../components/NationalStats'
import SummaryCard, { type RiskLevel } from '../components/SummaryCard'
import { AlertIcon, HeartIcon, LeafIcon } from '../components/Icons'
import { useAlertas, useUserLocation } from '../hooks/useAlertas'
import type { AlertLevel, Dominio } from '../lib/api'

const RISK_BY_LEVEL: Record<AlertLevel, RiskLevel> = { Bajo: 'bajo', Medio: 'medio', Alto: 'alto', Critico: 'critico' }

type DomainSummaryProps = {
  dominio: Dominio
  title: string
  icon: ComponentType<{ className?: string }>
  iconClassName: string
  to: string
  extraDetails?: ReactNode
}

/** Tarjeta de resumen de un dominio: el riesgo y el resumen salen de su alerta vigente más grave. */
function DomainSummary({ dominio, extraDetails, ...card }: DomainSummaryProps) {
  const { deMiZona, otras, location, status, reload } = useAlertas(dominio)
  const top = deMiZona[0]

  if (status !== 'ok') {
    const failed = status === 'error'
    return (
      <SummaryCard
        {...card}
        risk="sinDatos"
        summary={failed ? 'No pudimos cargar las alertas.' : 'Cargando alertas…'}
        details={
          failed ? (
            <button type="button" onClick={reload} className="font-semibold text-sky-700 dark:text-cyan-300 underline">
              Reintentar
            </button>
          ) : (
            'Cargando…'
          )
        }
      />
    )
  }

  const emptySummary = location
    ? `Sin alertas vigentes en tu zona${otras.length ? ` (${otras.length} en otras regiones)` : ''}.`
    : 'Sin alertas vigentes.'

  return (
    <SummaryCard
      {...card}
      risk={top ? RISK_BY_LEVEL[top.level] : 'sinAlertas'}
      summary={top ? `${top.title}${top.region ? ` (${top.region})` : ""}` : emptySummary}
      details={
        <>
          {deMiZona.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5">
              {deMiZona.map((alert) => (
                <li key={alert.id}>{alert.description}</li>
              ))}
            </ul>
          ) : (
            <p>Revisa el módulo para ver las recomendaciones de prevención.</p>
          )}
          {extraDetails}
        </>
      }
    />
  )
}

/**
 * Pantalla de Inicio con Divulgación Progresiva:
 * solo muestra tarjetas de resumen; el detalle se abre bajo demanda o en cada módulo.
 */
export default function Home() {
  const location = useUserLocation()

  return (
    <div className="mx-auto max-w-5xl">
      <section className="mb-6">
        <h2 className="text-xl font-bold md:text-2xl">Resumen de hoy</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {location
            ? `Estado preventivo ante el Fenómeno El Niño en ${location.district}, ${location.department}.`
            : 'Alertas ante el Fenómeno El Niño en todo el país. Activa tu ubicación para ver tu zona.'}
        </p>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <DomainSummary dominio="salud" title="Salud" icon={HeartIcon} iconClassName="bg-rose-50 dark:bg-rose-400/10 text-rose-600" to="/salud" />
        <DomainSummary dominio="agricultura" title="Agro" icon={LeafIcon} iconClassName="bg-emerald-50 dark:bg-emerald-400/10 text-emerald-600" to="/agro" />
        <DomainSummary
          dominio="infraestructura"
          title="Emergencias"
          icon={AlertIcon}
          iconClassName="bg-amber-50 dark:bg-amber-400/10 text-amber-600"
          to="/infraestructura"
          extraDetails={<p className="mt-2">Emergencias: 911 (Central Única, Lima y Callao) · 116 (Bomberos) · 115 (Defensa Civil) · 106 (SAMU).</p>}
        />
      </div>

      <NationalStats />
    </div>
  )
}
