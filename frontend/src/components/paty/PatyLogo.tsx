import { CloudSun } from 'lucide-react'

// Colores de los 8 pétalos en sentido horario empezando por arriba (dorados arriba/izquierda, azules abajo/derecha)
const PETALS = ['#facc15', '#eab308', '#38bdf8', '#3b82f6', '#0ea5e9', '#60a5fa', '#facc15', '#fde047']

/**
 * Logo "sol/flor tecnológico" de Paty.
 * Solo los pétalos giran (animate-spin-slow); el disco central queda fijo para que el ícono sea legible.
 * `motion-safe` respeta la preferencia del sistema de reducir animaciones.
 */
export default function PatyLogo() {
  return (
    <div className="relative h-40 w-40" role="img" aria-label="Logo de Paty">
      {/* Halo luminoso detrás del logo */}
      <div className="absolute inset-6 rounded-full bg-yellow-300/20 blur-2xl" aria-hidden />

      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full motion-safe:animate-spin-slow" aria-hidden>
        {PETALS.map((color, i) => (
          <ellipse key={i} cx="100" cy="42" rx="19" ry="30" fill={color} transform={`rotate(${i * 45} 100 100)`} />
        ))}
      </svg>

      {/* Disco central */}
      <div className="absolute left-1/2 top-1/2 flex h-[45%] w-[45%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-[#1c2f55] bg-[#0d1a33] shadow-[0_0_24px_rgba(250,204,21,0.25)]">
        <CloudSun className="h-9 w-9 text-yellow-400" strokeWidth={2} aria-hidden />
      </div>
    </div>
  )
}
