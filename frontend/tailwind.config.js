/** @type {import('tailwindcss').Config} */
export default {
  // Archivos donde Tailwind busca clases para generar el CSS final
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // Modo oscuro controlado por la clase `dark` en <html> (ver hooks/useTheme.ts)
  darkMode: 'class',
  theme: {
    extend: {
      // Rotación lenta y continua para el logo de Paty
      animation: {
        'spin-slow': 'spin 24s linear infinite',
        // Onda expansiva para el marcador de ubicación, el avatar y el botón SOS
        'pulse-ring': 'pulse-ring 2.2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { transform: 'scale(0.8)', opacity: '0.7' },
          '80%, 100%': { transform: 'scale(1.8)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}
