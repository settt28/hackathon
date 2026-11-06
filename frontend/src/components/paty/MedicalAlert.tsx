import { useEffect, useRef, useState } from 'react'
import { Ambulance, Phone, X } from 'lucide-react'
import { useBackHandler } from '../../hooks/useBackHandler'

const COUNTDOWN = 5

interface MedicalAlertProps {
  /** Número a llamar (SAMU 106). */
  number: string
  /** Qué hacer ahora mismo mientras llega la ayuda. */
  measure: string
  /** Grave: cuenta regresiva y abre las llamadas del celular solo. Moderado: solo recomienda llamar. */
  urgent: boolean
  onClose: () => void
}

/**
 * Alerta flotante de salud. En una emergencia médica grave dice "Direccionando al SAMU (106)…" y, al terminar la
 * cuenta, abre la app de llamadas con el número marcado (el navegador no puede llamar solo: la persona confirma
 * con el botón verde de su teléfono). "Llamar ahora" hace lo mismo sin esperar.
 */
export default function MedicalAlert({ number, measure, urgent, onClose }: MedicalAlertProps) {
  const [left, setLeft] = useState(urgent ? COUNTDOWN : 0)
  const [opened, setOpened] = useState(false)
  const callRef = useRef<HTMLAnchorElement>(null)
  const tel = `tel:${number.replace(/[^\d+]/g, '')}`

  // Cuenta regresiva → al llegar a 0 abre el marcador, una sola vez
  useEffect(() => {
    if (!urgent || opened) return
    const t = setTimeout(() => {
      if (left > 1) return setLeft(left - 1)
      setLeft(0)
      setOpened(true)
      window.location.href = tel
    }, 1000)
    return () => clearTimeout(t)
  }, [urgent, left, opened, tel])

  // Siempre el onClose más reciente, sin volver a enfocar "Llamar" cada vez que el chat se redibuja
  // "Atrás" de Android cierra la alerta (igual que Cancelar), en vez de salir del chat
  useBackHandler(true, onClose)

  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  // Foco en "Llamar" (una vez, al abrir) para que funcione con teclado y lectores de pantalla; Escape cancela
  useEffect(() => {
    callRef.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCloseRef.current()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-3 pb-[max(0.75rem,var(--safe-bottom))] pt-[max(0.75rem,var(--safe-top))] backdrop-blur-[2px] sm:items-center" onClick={onClose}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="medical-alert-title"
        aria-describedby="medical-alert-desc"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-3xl border-2 border-red-400/70 bg-white shadow-[0_20px_60px_rgba(239,68,68,0.35)] motion-safe:animate-[alert-in_.25s_ease-out] dark:bg-[#140a0d]"
      >
        <div className="flex items-start gap-3 bg-gradient-to-r from-red-500 to-red-700 px-4 py-3 text-white">
          <span className="relative mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white">
            {urgent && <span className="absolute inset-0 rounded-full bg-white/60 motion-safe:animate-ping" aria-hidden />}
            <Ambulance className="relative h-6 w-6 text-red-600" aria-hidden />
          </span>
          <div className="min-w-0 flex-1" aria-live="assertive">
            <p className="text-[10px] font-extrabold tracking-[0.18em] text-red-100">{urgent ? 'EMERGENCIA MÉDICA' : 'TU SALUD'}</p>
            <h2 id="medical-alert-title" className="text-lg font-extrabold leading-tight">
              {urgent
                ? opened
                  ? `Abriendo llamadas al SAMU (${number})…`
                  : `Direccionando al SAMU (${number}) en ${left}…`
                : `Si empeora, llama al SAMU (${number})`}
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Cancelar" className="rounded-full p-1.5 text-white/90 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 px-4 py-4">
          <p id="medical-alert-desc" className="text-[15px] leading-relaxed text-slate-800 dark:text-slate-100">
            <span className="font-bold">Mientras tanto: </span>
            {measure}
          </p>
          <a
            ref={callRef}
            href={tel}
            onClick={() => setOpened(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-4 py-3.5 text-lg font-extrabold text-white shadow-lg transition hover:bg-red-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-300 active:scale-[0.98]"
          >
            <Phone className="h-5 w-5" aria-hidden />
            Llamar ahora al {number}
          </a>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 dark:border-white/15 dark:text-slate-300 dark:hover:bg-white/5"
          >
            {urgent && !opened ? 'Cancelar, no es una emergencia' : 'Cerrar'}
          </button>
          <p className="text-center text-[11px] text-slate-500 dark:text-slate-400">SAMU · ambulancia gratuita para cualquier persona</p>
        </div>
      </div>
    </div>
  )
}
