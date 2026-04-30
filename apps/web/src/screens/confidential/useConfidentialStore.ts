/**
 * React binding for the confidential store. Uses useSyncExternalStore so the
 * store stays framework-free.
 */

import { useSyncExternalStore } from "react"
import { confidentialStore } from "../../store/confidential"

export function useConfidentialStore() {
  return useSyncExternalStore(
    confidentialStore.subscribe,
    confidentialStore.getSnapshot,
    confidentialStore.getSnapshot,
  )
}
