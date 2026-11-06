/**
 * Almacén clave-valor sobre IndexedDB, sin librerías.
 * Guarda el paquete offline (/api/sync) y la última respuesta de cada endpoint para que la app
 * siga mostrando información real cuando no hay conexión.
 *
 * Se usa IndexedDB y no localStorage porque el paquete de una zona pesa varios MB
 * (postas de salud, límites del distrito) y localStorage se queda en ~5 MB y es síncrono.
 *
 * Si el navegador bloquea el almacenamiento (modo incógnito, permisos), todas las funciones
 * devuelven null en silencio: la app funciona igual, solo sin memoria entre sesiones.
 */

const DB_NAME = 'paty'
const STORE = 'kv'
const VERSION = 1

let dbPromise: Promise<IDBDatabase | null> | null = null

function openDb(): Promise<IDBDatabase | null> {
  dbPromise ??= new Promise((resolve) => {
    if (!('indexedDB' in globalThis)) return resolve(null)
    let req: IDBOpenDBRequest
    try {
      req = indexedDB.open(DB_NAME, VERSION)
    } catch {
      return resolve(null)
    }
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => {
      dbPromise = null // permitir reintentar más tarde
      resolve(null)
    }
    req.onblocked = () => resolve(null)
  })
  return dbPromise
}

/** Ejecuta una operación en el almacén y resuelve a null si algo falla (nunca lanza). */
function run<T>(mode: IDBTransactionMode, op: (store: IDBObjectStore) => IDBRequest): Promise<T | null> {
  return openDb().then(
    (db) =>
      new Promise<T | null>((resolve) => {
        if (!db) return resolve(null)
        let req: IDBRequest
        try {
          req = op(db.transaction(STORE, mode).objectStore(STORE))
        } catch {
          return resolve(null)
        }
        req.onsuccess = () => resolve((req.result ?? null) as T | null)
        req.onerror = () => resolve(null)
      }),
  )
}

export const idbGet = <T>(key: string): Promise<T | null> => run<T>('readonly', (s) => s.get(key))

/** El valor debe ser JSON plano (lo copia el algoritmo de clonado estructurado del navegador). */
export const idbSet = (key: string, value: unknown): Promise<unknown> => run('readwrite', (s) => s.put(value, key))

export const idbDelete = (key: string): Promise<unknown> => run('readwrite', (s) => s.delete(key))

export const idbKeys = (): Promise<string[]> => run<IDBValidKey[]>('readonly', (s) => s.getAllKeys()).then((k) => (k ?? []).map(String))
