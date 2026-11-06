import { useSyncExternalStore } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'paty-theme'
const DEFAULT_THEME: Theme = 'dark'

/** Lee la preferencia guardada; si no hay (o el almacenamiento está bloqueado), usa el tema por defecto. */
function readStoredTheme(): Theme {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (value === 'light' || value === 'dark') return value
  } catch {
    /* modo privado o almacenamiento bloqueado */
  }
  return DEFAULT_THEME
}

/** Tailwind (darkMode: 'class') activa las variantes `dark:` cuando <html> tiene la clase `dark`. */
function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

// Estado global mínimo (sin Context): un valor + suscriptores para useSyncExternalStore
let currentTheme: Theme = readStoredTheme()
const listeners = new Set<() => void>()

// Se aplica al importar el módulo (desde main.tsx), antes del primer render, para evitar parpadeos
applyTheme(currentTheme)

export function setTheme(theme: Theme) {
  currentTheme = theme
  applyTheme(theme)
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    /* sin persistencia: el tema sigue funcionando en la sesión actual */
  }
  listeners.forEach((notify) => notify())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Tema actual compartido por toda la app (dashboard, chat de Paty, etc.). */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, () => currentTheme)
  return {
    theme,
    isDark: theme === 'dark',
    setTheme,
    toggleTheme: () => setTheme(currentTheme === 'dark' ? 'light' : 'dark'),
  }
}
