/**
 * Última respuesta buena de cada lectura del servidor, guardada en IndexedDB.
 * Es lo que la app muestra cuando no hay conexión: datos reales de la última vez,
 * con la fecha en que se guardaron para poder advertir que no están al día.
 */
import { idbGet, idbSet } from './idb'

const PREFIX = 'respuesta:'

export interface Saved<T> {
  data: T
  /** Marca de tiempo (Date.now()) en que se guardó. */
  savedAt: number
}

export const readCache = <T>(key: string): Promise<Saved<T> | null> => idbGet<Saved<T>>(PREFIX + key)

export const writeCache = <T>(key: string, data: T): Promise<unknown> =>
  idbSet(PREFIX + key, { data, savedAt: Date.now() } satisfies Saved<T>)
