/**
 * BroadcastResult — polls the chain for tx finality and renders one of:
 *
 *   pending   → tx in mempool, no inclusion yet
 *   confirmed → at least one block confirmation
 *   failed    → tx reverted (EVM) or rejected by network
 *   timeout   → still pending after 60s; user can check explorer later
 *
 * EVM uses wagmi's `useWaitForTransactionReceipt`. Non-EVM chains get a
 * bounded timeout; Foundation Blue can plug in chain-specific pollers
 * later by exposing them through the chain-* lib modules.
 */
import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useWaitForTransactionReceipt } from "wagmi"
import { useSendStore } from "../../store/send"
import { CHAINS } from "../../lib/asset"
import { evmChainDef } from "../../lib/chains"

type Phase = "pending" | "confirmed" | "failed" | "timeout"

export default function BroadcastResult() {
  const { hash } = useParams<{ hash: string }>()
  const navigate = useNavigate()
  const { asset, reset } = useSendStore()
  const chain = asset ? CHAINS[asset.chainId] : null

  const [phase, setPhase] = useState<Phase>("pending")

  const evmReceipt = useWaitForTransactionReceipt({
    hash: hash as `0x${string}` | undefined,
    chainId: chain?.evmChainId,
    query: {
      enabled: !!hash && chain?.kind === "evm",
    },
  })

  useEffect(() => {
    if (chain?.kind !== "evm") return
    if (evmReceipt.isLoading) {
      setPhase("pending")
      return
    }
    if (evmReceipt.isError) {
      setPhase("failed")
      return
    }
    if (evmReceipt.data) {
      setPhase(
        evmReceipt.data.status === "success" ? "confirmed" : "failed",
      )
    }
  }, [chain, evmReceipt.isLoading, evmReceipt.isError, evmReceipt.data])

  // Non-EVM bounded poll.
  useEffect(() => {
    if (chain?.kind === "evm") return
    if (!hash) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      if (!cancelled) setPhase("timeout")
    }, 60_000)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [chain, hash])

  const explorerUrl = explorerUrlFor(hash, chain?.id)

  const onDone = () => {
    reset()
    navigate("/", { replace: true })
  }

  return (
    <div
      style={{
        padding: "1rem",
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        alignItems: "center",
        maxWidth: "480px",
        margin: "0 auto",
      }}
    >
      <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>
        {phase === "pending" && "Broadcasting"}
        {phase === "confirmed" && "Sent"}
        {phase === "failed" && "Failed"}
        {phase === "timeout" && "Still pending"}
      </h1>

      <PhaseIcon phase={phase} />

      <p
        style={{
          color: "var(--color10, #888)",
          textAlign: "center",
          margin: 0,
        }}
      >
        {phase === "pending" && "Waiting for chain confirmation…"}
        {phase === "confirmed" && "Your transaction is confirmed."}
        {phase === "failed" &&
          "The transaction was rejected by the network."}
        {phase === "timeout" &&
          "Confirmation is taking longer than usual. You can close this and check the explorer later."}
      </p>

      {hash ? (
        <div
          style={{
            padding: "0.75rem",
            background: "var(--color2, #111)",
            borderRadius: "0.5rem",
            width: "100%",
          }}
        >
          <code
            style={{
              fontFamily: "ui-monospace, SFMono-Regular, monospace",
              fontSize: "0.75rem",
              wordBreak: "break-all",
              display: "block",
            }}
          >
            {hash}
          </code>
        </div>
      ) : null}

      <div style={{ display: "flex", gap: "0.75rem", width: "100%" }}>
        {explorerUrl ? (
          <button
            onClick={() =>
              window.open(explorerUrl, "_blank", "noopener,noreferrer")
            }
            style={{ ...btnSecondary, flex: 1 }}
          >
            View on explorer
          </button>
        ) : null}
        <button onClick={onDone} style={{ ...btnPrimary, flex: 1 }}>
          Done
        </button>
      </div>
    </div>
  )
}

function PhaseIcon({ phase }: { phase: Phase }) {
  const color =
    phase === "confirmed"
      ? "var(--green10, #2db52d)"
      : phase === "failed"
      ? "var(--red10, #c44)"
      : "var(--color8, #888)"
  return (
    <div
      aria-hidden
      style={{
        width: 48,
        height: 48,
        borderRadius: "999px",
        background: color,
        opacity: phase === "pending" || phase === "timeout" ? 0.5 : 1,
      }}
    />
  )
}

/** The transaction on its chain's explorer: the brand's own explorer for its
 *  chains (`brand.json:explorer`), the public one for an external chain. */
function explorerUrlFor(
  hash: string | undefined,
  chainId: string | undefined,
): string | null {
  if (!hash || !chainId) return null
  const chain = CHAINS[chainId]
  if (chain?.kind === "solana") return `https://solscan.io/tx/${hash}`
  const base = chain?.evmChainId !== undefined
    ? evmChainDef(chain.evmChainId)?.blockExplorers?.default.url
    : undefined
  return base ? `${base}/tx/${hash}` : null
}

const btnPrimary: React.CSSProperties = {
  padding: "0.875rem 1rem",
  borderRadius: "0.5rem",
  border: "none",
  background: "var(--color12, #fff)",
  color: "var(--color1, #000)",
  fontSize: "1rem",
  fontWeight: 600,
  cursor: "pointer",
}

const btnSecondary: React.CSSProperties = {
  padding: "0.875rem 1rem",
  borderRadius: "0.5rem",
  border: "1px solid var(--color6, #333)",
  background: "transparent",
  color: "var(--color12, #fff)",
  fontSize: "1rem",
  cursor: "pointer",
}
