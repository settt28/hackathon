import { useEffect, useRef, useState, type FC } from 'react'
import { History, MapPin, X } from 'lucide-react'
import type { RiskMapState } from '../../hooks/useRiskMap'
import RiskMap from './RiskMap'
import RiskLegend from './RiskLegend'
import DistrictDetail from './DistrictDetail'

interface RiskMapSheetProps {
  open: boolean
  onClose: () => void
  onViewHistory: () => void
  /** El mismo mapa de riesgo que la tarjeta del inicio (datos reales del backend). */
  state: RiskMapState
  retry: () => void
}

/**
 * Pop-up "Riesgo en tu zona" (hoja inferior a pantalla completa): mapa grande de los distritos reales,
 * leyenda y el detalle del distrito tocado, con todos los motivos de su nivel.
 * Se cierra con la X, tocando el fondo oscuro o con la tecla Escape.
 */
const RiskMapSheet: FC<RiskMapSheetProps> = ({ open, onClose, onViewHistory, state, retry }) => {
  const map = state.kind === 'ok' ? state.map : null
  const mine = map?.features.find((f) => f.properties.esTuDistrito) ?? map?.features[0] ?? null
  const [selected, setSelected] = useState<string | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  // Escape para cerrar + foco inicial en el botón de cerrar
  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  // Por defecto, el distrito del usuario
  const current = map?.features.find((f) => f.properties.ubigeo === selected) ?? mine

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end">
      {/* Fondo oscuro: tocarlo cierra el pop-up */}
      <button type="button" aria-label="Cerrar mapa de riesgo" onClick={onClose} className="absolute inset-0 bg-slate-950/60 motion-safe:animate-fade-in" tabIndex={-1} />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="riesgo-titulo"
        className="relative max-h-[94%] overflow-y-auto rounded-t-[2rem] border-t border-slate-200 bg-white px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2 shadow-2xl motion-safe:animate-sheet-up dark:border-cyan-400/20 dark:bg-[#0b1a26]"
      >
        {/* Asa de arrastre (visual) */}
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-white/20" aria-hidden />

        <header className="flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-sky-200 bg-sky-50 dark:border-cyan-400/30 dark:bg-transparent">
            <MapPin className="h-5 w-5 text-sky-600 dark:text-cyan-300" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-extrabold tracking-[0.16em] text-sky-600 dark:text-cyan-300">RIESGO EN TU ZONA</p>
            <h2 id="riesgo-titulo" className="truncate text-xl font-extrabold text-slate-900 dark:text-white">
              {map?.tuDistrito ? `${map.tuDistrito.nombre}, ${map.tuDistrito.departamento}` : 'Tu zona'}
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-white/10 dark:bg-[#070d17] dark:text-white dark:hover:bg-white/5 dark:focus-visible:ring-cyan-400"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {map && current ? (
          <>
            <div className="mt-3">
              <RiskMap map={map} selected={current.properties.ubigeo} onSelect={setSelected} onLocate={() => setSelected(null)} />
            </div>
            <RiskLegend legend={map.leyenda} />
            <p className="mt-2 text-center text-[11px] text-slate-500 dark:text-slate-400">Toca un distrito para ver su detalle.</p>
            <DistrictDetail district={current} />
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">{map.aviso}</p>
          </>
        ) : (
          <div className="my-10 flex flex-col items-center gap-3 text-center text-sm text-slate-600 dark:text-slate-300">
            <p>{state.kind === 'loading' ? 'Cargando el mapa de riesgo…' : 'Activa tu ubicación para ver el riesgo de tu zona.'}</p>
            {state.kind !== 'loading' && (
              <button type="button" onClick={retry} className="rounded-full border border-sky-200 px-4 py-2 font-semibold text-sky-700 dark:border-cyan-400/40 dark:text-cyan-200">
                Reintentar
              </button>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={onViewHistory}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 py-3 text-[15px] font-bold text-white transition-colors hover:bg-sky-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 active:scale-[0.98] dark:bg-cyan-400 dark:text-[#070d17] dark:hover:bg-cyan-300"
        >
          <History className="h-5 w-5" aria-hidden />
          Ver historial del distrito
        </button>
      </section>
    </div>
  )
}

export default RiskMapSheet
