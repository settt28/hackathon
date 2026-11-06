import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // /api → backend .NET (puerto de launchSettings.json). Evita CORS y URLs fijas en el código.
  server: { proxy: { '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:5261' } },
  preview: { proxy: { '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:5261' } },
})
