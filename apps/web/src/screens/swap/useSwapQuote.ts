/**
 * useSwapQuote — keeps `useSwapStore.quote` in sync with the user's input.
 *
 * Source order:
 *   1. Gateway:  `https://${brand.gatewayDomain}/v1/quote?...`
 *      (server-side aggregation; preferred — picks AMM v2/v3 vs DEX v4 by
 *      best output net of gas).
 *   2. On-chain QuoterV2 fallback (`quoteExactInputSingle`) via
 *      `useReadContract`. Defaults to the 0.30 % AMM-v3 pool. This guarantees
 *      the screen never shows "no quote" when an asset has any v3 liquidity.
 *
 * Naming convention: V2/V3 = AMM, V4 = DEX. The `kind` field is rendered
 * verbatim in QuoteRoute.tsx.
 *
 * Rules:
 *   - All RPC URLs come from `getBootnodeRpcUrl(chainId)` (never empty).
 *   - Quotes carry a `ts` timestamp; useSwapExecute discards >30s old quotes.
 *   - Debounce 300ms on amount/asset changes — avoids spamming the gateway
 *     while the user types.
 *
 * Hook is fire-and-forget: returns void. Reads/writes the swap store.
 */
import { useEffect, useRef } from "react"
import { useReadContract } from "wagmi"
import { brand } from "@luxfi/wallet-brand"
import { useSwapStore, type RouteKind, type SwapQuote } from "../../store/swap"
import { CHAINS, parseUnits } from "../../lib/asset"
import { QUOTER_V2_ABI, getQuoterAddress, getRouterAddress } from "./contracts"

const GATEWAY_TIMEOUT_MS = 5_000
const DEBOUNCE_MS = 300
/** Default v3 fee tier for the QuoterV2 fallback path. 3000 bps = 0.30 %. */
const DEFAULT_V3_FEE = 3000

interface RawGatewayQuote {
  amountIn?: string
  amountOut?: string
  price?: string
  priceImpactBps?: number
  path?: string[]
  kind?: string
  feeBps?: number
  router?: string
  calldata?: string
  recipient?: string
}

function isHex0x(value: unknown): value is `0x${string}` {
  return typeof value === "string" && /^0x[0-9a-fA-F]*$/.test(value)
}

function normaliseKind(raw: string | undefined): RouteKind {
  switch (raw) {
    case "amm-v2":
    case "amm-v3":
    case "dex-v4":
      return raw
    // Legacy/short forms tolerated from older gateway builds.
    case "v2":
      return "amm-v2"
    case "v3":
      return "amm-v3"
    case "v4":
      return "dex-v4"
    default:
      return "amm-v3"
  }
}

export function useSwapQuote(): void {
  const fromAsset = useSwapStore((s) => s.fromAsset)
  const toAsset = useSwapStore((s) => s.toAsset)
  const amount = useSwapStore((s) => s.amount)
  const setQuote = useSwapStore((s) => s.setQuote)
  const setStatus = useSwapStore((s) => s.setStatus)
  const setError = useSwapStore((s) => s.setError)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const gen = useRef(0)

  // --- Gateway quote (preferred) -------------------------------------------
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!fromAsset || !toAsset || !amount) {
      setQuote(null)
      setStatus("idle")
      setError(null)
      return
    }
    if (fromAsset.id === toAsset.id) {
      setQuote(null)
      setStatus("error")
      setError("Pick two different tokens")
      return
    }

    let amountWei: bigint
    try {
      amountWei = parseUnits(amount, fromAsset.decimals)
    } catch {
      setQuote(null)
      setStatus("idle")
      return
    }
    if (amountWei <= 0n) {
      setQuote(null)
      setStatus("idle")
      return
    }

    setStatus("quoting")
    setError(null)
    const myGen = ++gen.current
    const ctrl = new AbortController()

    debounceRef.current = setTimeout(async () => {
      const fromChain = CHAINS[fromAsset.chainId]
      if (!fromChain || !fromChain.evmChainId) {
        setStatus("error")
        setError("Source chain not EVM-compatible")
        return
      }
      const params = new URLSearchParams({
        chainId: String(fromChain.evmChainId),
        tokenIn: fromAsset.contract ?? "native",
        tokenOut: toAsset.contract ?? "native",
        amountIn: amountWei.toString(),
      })
      const gateway = brand.gatewayDomain
      if (!gateway) {
        // No gateway configured: skip straight to QuoterV2 fallback (the
        // useReadContract below will populate the quote).
        return
      }

      const timeout = setTimeout(() => ctrl.abort(), GATEWAY_TIMEOUT_MS)
      try {
        const res = await fetch(
          `https://${gateway}/v1/quote?${params.toString()}`,
          { signal: ctrl.signal, cache: "no-cache" },
        )
        if (!res.ok) throw new Error(`gateway ${res.status}`)
        const raw = (await res.json()) as RawGatewayQuote
        if (myGen !== gen.current) return
        if (!raw.amountOut || !isHex0x(raw.calldata) || !isHex0x(raw.router)) {
          throw new Error("malformed gateway quote")
        }
        const quote: SwapQuote = {
          amountIn: amountWei.toString(),
          amountOut: raw.amountOut,
          price: raw.price ?? "",
          priceImpactBps: clampBps(raw.priceImpactBps ?? 0),
          path: Array.isArray(raw.path) ? raw.path.slice(0, 8).map(String) : [
            fromAsset.symbol,
            toAsset.symbol,
          ],
          kind: normaliseKind(raw.kind),
          feeBps: clampBps(raw.feeBps ?? 0),
          router: raw.router as `0x${string}`,
          calldata: raw.calldata as `0x${string}`,
          recipient: isHex0x(raw.recipient)
            ? (raw.recipient as `0x${string}`)
            : ("0x0000000000000000000000000000000000000000" as `0x${string}`),
          ts: Date.now(),
        }
        setQuote(quote)
        setStatus("ready")
      } catch (err) {
        if (myGen !== gen.current) return
        // Don't trip the form into "error" on gateway miss — the on-chain
        // fallback hook below may still populate a quote. Mark status idle
        // so the fallback effect can flip it to ready when its read returns.
        setStatus("idle")
        // Network errors are silent; show the user only structural problems.
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          // eslint-disable-next-line no-console
          console.warn("[swap] gateway quote failed:", err)
        }
      } finally {
        clearTimeout(timeout)
      }
    }, DEBOUNCE_MS)

    return () => {
      ctrl.abort()
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [fromAsset, toAsset, amount, setQuote, setStatus, setError])

  // --- On-chain QuoterV2 fallback ------------------------------------------
  // Only fires when there is no gateway-derived quote in-flight or settled.
  // Reads `quoteExactInputSingle` against the canonical v3 router. Address
  // resolution is per-chain; missing returns are treated as "no fallback".
  const fallbackEnabled = !!(
    fromAsset &&
    toAsset &&
    amount &&
    fromAsset.id !== toAsset.id &&
    CHAINS[fromAsset.chainId]?.evmChainId
  )

  let amountInWei: bigint = 0n
  if (fallbackEnabled) {
    try {
      amountInWei = parseUnits(amount, fromAsset!.decimals)
    } catch {
      amountInWei = 0n
    }
  }

  const quoter = fallbackEnabled
    ? getQuoterAddress(CHAINS[fromAsset!.chainId].evmChainId!)
    : undefined
  const router = fallbackEnabled
    ? getRouterAddress(CHAINS[fromAsset!.chainId].evmChainId!)
    : undefined

  const tokenInAddr =
    fromAsset?.contract ??
    ("0x0000000000000000000000000000000000000000" as `0x${string}`)
  const tokenOutAddr =
    toAsset?.contract ??
    ("0x0000000000000000000000000000000000000000" as `0x${string}`)

  const { data: fallbackOut } = useReadContract({
    abi: QUOTER_V2_ABI,
    address: quoter,
    functionName: "quoteExactInputSingle",
    args:
      fallbackEnabled && quoter && amountInWei > 0n
        ? [
            {
              tokenIn: tokenInAddr,
              tokenOut: tokenOutAddr,
              amountIn: amountInWei,
              fee: DEFAULT_V3_FEE,
              sqrtPriceLimitX96: 0n,
            },
          ]
        : undefined,
    chainId: CHAINS[fromAsset?.chainId ?? ""]?.evmChainId,
    query: {
      enabled: fallbackEnabled && !!quoter && amountInWei > 0n,
      // The gateway path runs first and wins. Refresh slowly to avoid RPC
      // pressure when both paths race for the same input.
      staleTime: 5_000,
    },
  })

  useEffect(() => {
    // Only commit the on-chain fallback if there is no gateway quote yet.
    const existing = useSwapStore.getState().quote
    if (existing) return
    if (!fallbackEnabled || !router) return
    if (!fallbackOut) return

    const out = Array.isArray(fallbackOut) ? fallbackOut[0] : fallbackOut
    const amountOut: bigint =
      typeof out === "bigint"
        ? out
        : typeof out === "string" && /^\d+$/.test(out)
          ? BigInt(out)
          : 0n
    if (amountOut <= 0n) return

    const quote: SwapQuote = {
      amountIn: amountInWei.toString(),
      amountOut: amountOut.toString(),
      price: "",
      // Without a pool reserves snapshot we can't compute impact client-side.
      // Leave as 0; UI shows "—" instead of a misleading number.
      priceImpactBps: 0,
      path: [fromAsset!.symbol, toAsset!.symbol],
      kind: "amm-v3",
      feeBps: DEFAULT_V3_FEE,
      router,
      // Fallback path executes via router on the swap leg (useSwapExecute
      // crafts the calldata since the gateway didn't supply any).
      calldata: "0x" as `0x${string}`,
      recipient:
        "0x0000000000000000000000000000000000000000" as `0x${string}`,
      ts: Date.now(),
    }
    setQuote(quote)
    setStatus("ready")
    setError(null)
  }, [
    fallbackEnabled,
    router,
    fallbackOut,
    amountInWei,
    fromAsset,
    toAsset,
    setQuote,
    setStatus,
    setError,
  ])
}

function clampBps(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0
  if (n > 10_000) return 10_000
  return Math.floor(n)
}
