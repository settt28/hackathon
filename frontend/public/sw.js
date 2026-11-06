/**
 * Service worker de Paty: hace que la app ABRA sin conexión.
 *
 * El respaldo de *datos* vive en IndexedDB (src/lib/responseCache.ts y src/lib/sync.ts).
 * Esto resuelve el paso anterior: que el HTML, el JavaScript, el CSS y las tipografías estén en el
 * dispositivo, porque sin ellos no hay nada que mostrar aunque los datos estén guardados.
 *
 * La lista PRECACHE la escribe el build (ver el plugin "paty-offline-precache" en vite.config.ts)
 * con los nombres reales de los archivos, que llevan un hash y cambian en cada despliegue.
 * Incluye también los trozos de las rutas que se cargan en diferido: así "Historial" o "Emergencia"
 * funcionan sin conexión aunque la persona nunca las haya abierto antes.
 */

// El build sustituye ambos marcadores (plugin "paty-offline-precache" en vite.config.ts).
// La versión cambia en cada despliegue: así la caché vieja se borra entera en 'activate' y nadie
// se queda con una mezcla de archivos de dos versiones distintas.
const VERSION = __BUILD_ID__
const PRECACHE = __PRECACHE_MANIFEST__

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION).then(async (cache) => {
      // Uno por uno: si un archivo falla (403, red cortada a medias), el resto sí queda guardado
      await Promise.all(PRECACHE.map((url) => cache.add(new Request(url, { cache: 'reload' })).catch(() => {})))
      await self.skipWaiting()
    }),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Fuera las versiones anteriores: si no, el teléfono acumula un bundle por despliegue
      const names = await caches.keys()
      await Promise.all(names.filter((n) => n !== VERSION).map((n) => caches.delete(n)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // La API la gestiona la propia app: guarda cada respuesta en IndexedDB con su fecha para poder
  // advertir que los datos no están al día. Cachearla aquí además mostraría datos viejos sin avisar.
  if (url.pathname.startsWith('/api/')) return

  // Navegación (abrir la app o recargar una ruta): primero la red, y si no hay, el index guardado.
  // Es una SPA, así que cualquier ruta se sirve con el mismo documento.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => (await caches.match('/')) ?? (await caches.match('/index.html')) ?? Response.error()),
    )
    return
  }

  // Resto de archivos (JS, CSS, tipografías, iconos): primero lo guardado —es inmutable, lleva hash—
  // y si no está, se descarga y se guarda para la próxima vez que no haya señal.
  event.respondWith(
    caches.match(request).then(
      (hit) =>
        hit ??
        fetch(request).then((res) => {
          if (res.ok && res.type === 'basic') {
            const copy = res.clone()
            void caches.open(VERSION).then((c) => c.put(request, copy))
          }
          return res
        }),
    ),
  )
})
