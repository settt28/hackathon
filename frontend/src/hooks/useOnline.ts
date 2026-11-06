import { useSyncExternalStore } from 'react'
import { isOnline, subscribeConnection } from '../lib/connection'

/** True si la app puede hablar con el servidor ahora mismo. Ver lib/connection.ts. */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribeConnection, isOnline, () => true)
}
