/** @type {import('tailwindcss').Config} */
export default {
  // Archivos donde Tailwind busca clases para generar el CSS final
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Rotación lenta y continua para el logo de Paty
      animation: {
        'spin-slow': 'spin 24s linear infinite',
      },
    },
  },
  plugins: [],
}
