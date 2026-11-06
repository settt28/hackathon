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
  let bundled = new Set<string>()
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
      bundled = new Set([...files, '/index.html'])
    },
    // closeBundle y no writeBundle: public/ (donde vive sw.js) se copia al final del build
    closeBundle() {
      const swPath = path.resolve(outDir, 'sw.js')
      const source = fs.existsSync(swPath) ? fs.readFileSync(swPath, 'utf8') : null
      if (source === null) return this.warn(`no se encontró ${swPath}: la app no funcionará sin conexión`)

      // Todo lo que vive en public/ (manifest, iconos y los datos offline de Paty: distritos y
      // postas, ~1,5 MB) no pasa por Rollup, así que hay que recorrer la carpeta publicada.
      // Sin esto, la web sin conexión se queda sin distritos ni postas (en el APK son locales).
      const fromPublic: string[] = []
      const walk = (dir: string, prefix: string) => {
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
          const published = `${prefix}/${entry.name}`
          if (entry.isDirectory()) walk(path.join(dir, entry.name), published)
          else if (entry.name !== 'sw.js' && !bundled.has(published)) fromPublic.push(published)
        }
      }
      walk(outDir, '')

      const manifest = ['/', ...fromPublic, ...files]
      // Identidad del build: los nombres con hash del bundle MÁS el contenido de lo publicado sin hash (datos offline,
      // manifest, iconos). Si solo se actualizan distritos o postas, la versión cambia igual y los teléfonos los renuevan:
      // con la huella de los nombres solamente, se habrían quedado con los datos viejos para siempre.
      const hash = createHash('sha256').update(files.join('|'))
      for (const published of fromPublic) hash.update(published).update(fs.readFileSync(path.join(outDir, published)))
      const buildId = `paty-${hash.digest('hex').slice(0, 12)}`
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

/**
 * Content-Security-Policy de la web: solo se ejecuta JavaScript propio y solo se conecta a este origen, al backend
 * (VITE_API_URL) y a los mosaicos del mapa base. Es una segunda barrera: aunque algún día se colara HTML ajeno en la
 * página, el navegador no cargaría scripts de otros sitios ni mandaría datos (p. ej. la ubicación) a otro servidor.
 *
 * No va en el APK (`vite build --mode apk`): Capacitor inyecta su puente nativo como script en línea dentro del HTML,
 * y esta política lo bloquearía. Allí el contenido ya viene empaquetado dentro de la app.
 * Las cabeceras que solo valen por HTTP (frame-ancestors, HSTS) van en el servidor que publique la web.
 */
function contentSecurityPolicy(): Plugin {
  let csp = ''
  return {
    name: 'paty-csp',
    apply: 'build',
    configResolved(config) {
      if (config.mode === 'apk') return
      const api = config.env.VITE_API_URL ? new URL(config.env.VITE_API_URL).origin : ''
      csp = [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'", // estilos en línea de React (posición del mapa, colores de riesgo)
        "img-src 'self' data: blob: https://server.arcgisonline.com", // mapa base de Esri
        "font-src 'self' data:",
        `connect-src 'self' ${api}`.trim(),
        "media-src 'self' blob:", // voz de Paty (MP3 generado por el servidor)
        "worker-src 'self'",
        "manifest-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; ')
    },
    transformIndexHtml() {
      if (!csp) return
      return [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: csp }, injectTo: 'head-prepend' }]
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), offlinePrecache(), contentSecurityPolicy()],
  // /api → backend .NET (puerto de launchSettings.json). Evita CORS y URLs fijas en el código.
  server: { proxy: { '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:5261' } },
  preview: { proxy: { '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:5261' } },
})
