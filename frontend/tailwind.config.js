/** @type {import('tailwindcss').Config} */
export default {
  // Archivos donde Tailwind busca clases para generar el CSS final
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // Modo oscuro controlado por la clase `dark` en <html> (ver hooks/useTheme.ts)
  darkMode: 'class',
  theme: {
    extend: {
      // Tablet y celular en horizontal. Con tope superior: estas clases nunca afectan a la laptop (desde 1280 px)
      screens: {
        tablet: { raw: '(min-width: 640px) and (max-width: 1279.98px)' },
        // Poca altura (celular en horizontal): lo vital tiene que seguir a la vista
        short: { raw: '(max-height: 500px) and (max-width: 1279.98px)' },
      },
      // Inter como fuente principal (con las fuentes del sistema como respaldo)
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      // Rotación lenta y continua para el logo de Paty
      animation: {
        'spin-slow': 'spin 24s linear infinite',
        // Onda expansiva para el marcador de ubicación, el avatar y el botón SOS
        'pulse-ring': 'pulse-ring 2.2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite',
        // Pop-up tipo hoja inferior: sube desde abajo y el fondo aparece suavemente
        'sheet-up': 'sheet-up 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
        'fade-in': 'fade-in 0.2s ease-out',
      },
      keyframes: {
        'sheet-up': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.8)', opacity: '0.7' },
          '80%, 100%': { transform: 'scale(1.8)', opacity: '0' },
        },
        // Entrada de la alerta flotante de salud
        'alert-in': {
          '0%': { transform: 'translateY(16px) scale(0.98)', opacity: '0' },
          '100%': { transform: 'translateY(0) scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
