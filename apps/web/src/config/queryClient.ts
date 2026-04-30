/**
 * Single QueryClient for the SPA.
 *
 * Defaults match exchange/web: 30s stale time so view-switching doesn't
 * thrash RPC, retries off (the wallet shows a refresh button — silent
 * retries make balance/tx-status displays lie). Window-focus refetch off
 * for the same reason: a "stale" indicator is more honest than a flicker.
 */
import { QueryClient } from "@tanstack/react-query"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: false,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
})
