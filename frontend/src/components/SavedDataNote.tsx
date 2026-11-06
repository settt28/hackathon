import type { FC } from 'react'
import { Download } from 'lucide-react'
import { describeAge } from '../lib/dates'

/**
 * Aviso de que lo que se ve es la copia guardada en el dispositivo, no lo que hay ahora en el servidor.
 * Es deliberadamente discreto: la información sigue siendo útil, solo hay que saber de cuándo es.
 * No muestra nada si los datos están al día (`savedAt` null).
 */
const SavedDataNote: FC<{ savedAt: number | null; className?: string }> = ({ savedAt, className }) => {
  if (savedAt === null) return null
  return (
    <p className={`flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 ${className ?? ''}`}>
      <Download className="h-3 w-3 shrink-0" aria-hidden />
      Datos guardados en tu teléfono, {describeAge(savedAt)}
    </p>
  )
}

export default SavedDataNote
