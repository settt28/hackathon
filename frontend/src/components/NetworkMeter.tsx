import { useNetworkStatus, type NetworkQuality } from '../hooks/useNetworkStatus'

/**
 * Configuración visual por estado.
 * Las clases van completas (no concatenadas) para que Tailwind las detecte al compilar.
 */
const CONFIG: Record<NetworkQuality, { label: string; bars: number; bar: string; badge: string }> = {
  excelente: { label: 'Excelente', bars: 4, bar: 'bg-green-500', badge: 'bg-green-100 text-green-800' },
  bueno: { label: 'Bueno', bars: 3, bar: 'bg-yellow-400', badge: 'bg-yellow-100 text-yellow-800' },
  malo: { label: 'Malo', bars: 2, bar: 'bg-red-400', badge: 'bg-red-100 text-red-700' },
  horrible: { label: 'Horrible', bars: 1, bar: 'bg-red-600', badge: 'bg-red-200 text-red-900' },
  'sin-datos': { label: 'Sin datos', bars: 0, bar: 'bg-gray-400', badge: 'bg-gray-200 text-gray-700' },
}

// Alturas crecientes de las 4 barras de señal
const BAR_HEIGHTS = ['h-1.5', 'h-2.5', 'h-3.5', 'h-5']

/**
 * Medidor de calidad de red para la cabecera.
 * Toque/clic: simula el siguiente estado. Doble clic: vuelve a la red real.
 */
export default function NetworkMeter() {
  const { quality, simulated, cycle, reset } = useNetworkStatus()
  const cfg = CONFIG[quality]

  return (
    <button
      type="button"
      onClick={cycle}
      onDoubleClick={reset}
      title={simulated ? 'Simulación activa (doble clic para volver a la red real)' : 'Toca para simular estados'}
      aria-label={`Calidad de red: ${cfg.label}`}
      className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${cfg.badge}`}
    >
      {/* Barras de señal: las activas toman el color del estado, el resto queda en gris claro */}
      <span className="flex items-end gap-0.5" aria-hidden>
        {BAR_HEIGHTS.map((h, i) => (
          <span key={h} className={`w-1 rounded-sm ${h} ${i < cfg.bars ? cfg.bar : 'bg-gray-300'}`} />
        ))}
      </span>
      <span>{cfg.label}</span>
      {simulated && <span className="text-[10px] font-normal opacity-70">(sim)</span>}
    </button>
  )
}
