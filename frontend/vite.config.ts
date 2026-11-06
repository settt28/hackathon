import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'

/**
 * Escribe en public/sw.js la lista real de archivos del build.
 * Los nombres llevan un hash que cambia en cada despliegue, así que el service worker no puede
 * traerlos escritos a mano: sin esto, la app no abriría sin conexión.
 */
function offlinePrecache(): Plugin {
  let files: string[] = []
  // El directorio de salida sale del build, no se asume "dist": con --outDir distinto, el sw.js
  // se publicaría con el marcador sin sustituir y el navegador no registraría nada.
  let outDir = 'dist'
  return {
    name: 'paty-offline-precache',
    apply: 'build',
    writeBundle(options, bundle) {
      if (options.dir) outDir = options.dir
      // Todos los trozos de JS, el CSS y las tipografías; los .map no sirven sin conexión
      files = Object.keys(bundle)
        .filter((name) => name !== 'index.html' && !name.endsWith('.map'))
        .map((name) => `/${name}`)
    },
    // closeBundle y no writeBundle: public/ (donde vive sw.js) se copia al final del build
    closeBundle() {
      const swPath = path.resolve(outDir, 'sw.js')
      const source = fs.existsSync(swPath) ? fs.readFileSync(swPath, 'utf8') : null
      if (source === null) return this.warn(`no se encontró ${swPath}: la app no funcionará sin conexión`)

      const manifest = ['/', '/manifest.webmanifest', '/favicon.svg', '/icons.svg', ...files]
      // Identidad del build: los nombres con hash ya cambian en cada despliegue, así que sirven de huella
      const buildId = `paty-${createHash('sha256').update(files.join('|')).digest('hex').slice(0, 12)}`
      const filled = source
        .replace('__PRECACHE_MANIFEST__', JSON.stringify(manifest))
        .replace('__BUILD_ID__', JSON.stringify(buildId))
      // Si faltan los marcadores, el service worker quedaría roto en silencio: mejor fallar el build
      if (filled.includes('__PRECACHE_MANIFEST__') || filled.includes('__BUILD_ID__'))
        this.error('public/sw.js ya no contiene __PRECACHE_MANIFEST__ y __BUILD_ID__')
      fs.writeFileSync(swPath, filled)
      this.info(`service worker ${buildId}: ${manifest.length} archivos precargados para el modo sin conexión`)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), offlinePrecache()],
  // /api → backend .NET (puerto de launchSettings.json). Evita CORS y URLs fijas en el código.
  server: { proxy: { '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:5261' } },
  preview: { proxy: { '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:5261' } },
})
