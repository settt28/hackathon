import { useEffect, useRef, useState, type FC } from 'react'
import { History, MapPin, X } from 'lucide-react'
import RiskMap from './RiskMap'
import RiskLegend from './RiskLegend'
import DistrictDetail from './DistrictDetail'
import { DISTRICTS, USER_DISTRICT_ID } from './districts'

interface RiskMapSheetProps {
  open: boolean
  onClose: () => void
  onViewHistory: () => void
  /** Zona del usuario mostrada en la cabecera. */
  zoneName: string
}

/**
 * Pop-up "Riesgo en tu zona" (hoja inferior a pantalla completa).
 * Se cierra con la X, tocando el fondo oscuro o con la tecla Escape.
 */
const RiskMapSheet: FC<RiskMapSheetProps> = ({ open, onClose, onViewHistory, zoneName }) => {
  const [selectedId, setSelectedId] = useState(USER_DISTRICT_ID)
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
  const selected = DISTRICTS.find((d) => d.id === selectedId) ?? DISTRICTS[0]

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end">
      {/* Fondo oscuro: tocarlo cierra el pop-up */}
      <button type="button" aria-label="Cerrar mapa de riesgo" onClick={onClose} className="absolute inset-0 bg-slate-950/60 motion-safe:animate-fade-in" tabIndex={-1} />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="riesgo-titulo"
        className="relative max-h-[94%] overflow-y-auto rounded-t-[2rem] border-t border-slate-200 bg-white px-4 pb-6 pt-2 shadow-2xl motion-safe:animate-sheet-up dark:border-cyan-400/20 dark:bg-[#0b1a26]"
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
              {zoneName}
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

        <div className="mt-3">
          <RiskMap selectedId={selectedId} onSelect={(d) => setSelectedId(d.id)} onLocate={() => setSelectedId(USER_DISTRICT_ID)} />
        </div>
        <RiskLegend />
        <DistrictDetail district={selected} />

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
