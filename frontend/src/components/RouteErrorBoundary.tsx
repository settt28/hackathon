import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Ruta actual: al navegar a otra pantalla se limpia el error. */
  resetKey: string
}

/**
 * Si una pantalla falla (lo típico: no se pudo descargar su código con mala señal), en vez de una pantalla en
 * blanco se ofrece reintentar y los números de emergencia siguen a un toque.
 */
export default class RouteErrorBoundary extends Component<Props, { failed: boolean; key: string }> {
  state = { failed: false, key: this.props.resetKey }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  static getDerivedStateFromProps(props: Props, state: { failed: boolean; key: string }) {
    return props.resetKey === state.key ? null : { failed: false, key: props.resetKey }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error en la pantalla:', error, info.componentStack)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div role="alert" className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-[#f4f7fb] p-6 text-center dark:bg-[#070d17]">
        <p className="text-lg font-bold text-slate-900 dark:text-white">No pudimos abrir esta pantalla</p>
        <p className="max-w-xs text-sm text-slate-600 dark:text-slate-300">Puede ser la conexión. Inténtalo de nuevo.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-full bg-sky-600 px-5 py-2.5 font-semibold text-white dark:bg-cyan-400 dark:text-[#070d17]"
        >
          Reintentar
        </button>
        <a href="/" className="text-sm font-semibold text-sky-700 underline dark:text-cyan-300">
          Volver al inicio
        </a>
        <a href="tel:911" className="mt-4 rounded-2xl bg-red-600 px-5 py-3 font-extrabold text-white">
          Emergencia: llamar al 911
        </a>
      </div>
    )
  }
}
