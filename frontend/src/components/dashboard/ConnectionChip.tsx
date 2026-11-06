import type { FC } from 'react'
import clsx from 'clsx'
import { useOnline } from '../../hooks/useOnline'

/**
 * NUEVO: chip de estado de conexión (esquina superior izquierda del Header).
 * Refleja si la app puede hablar con el servidor: "Online" en verde o "Sin conexión" en gris
 * (ver lib/connection.ts: también cuenta como sin conexión un servidor que no responde).
 */
const ConnectionChip: FC = () => {
  const online = useOnline()

  return (
    <span
      role="status"
      className={clsx(
        'flex items-center gap-2 rounded-full border px-3 py-1 text-[13px] font-semibold',
        online
          ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-300'
          : 'border-slate-300 bg-slate-100 text-slate-500 dark:border-white/15 dark:bg-white/5 dark:text-slate-400',
      )}
    >
      <span className="relative flex h-2 w-2" aria-hidden>
        {online && <span className="absolute inset-0 rounded-full bg-emerald-400 motion-safe:animate-ping" />}
        <span className={clsx('relative h-2 w-2 rounded-full', online ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-slate-400')} />
      </span>
      {online ? 'Online' : 'Sin conexión'}
    </span>
  )
}

export default ConnectionChip
