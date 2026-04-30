/**
 * Single F-Chain balance row.
 *
 * Default state: shows lock icon + "Hidden". Tap → opens RevealCommittee
 * modal which drives the threshold-decrypt session. On success the row
 * shows the plaintext amount with a TTL countdown; on TTL expiry the row
 * auto-rehides.
 */

import { useEffect, useState } from "react"
import type { CSSProperties } from "react"
import { LOCK, UNLOCK, colors, layout, text } from "./styles"
import { useFHEBalance } from "./useFHEBalance"
import { confidentialStore } from "../../store/confidential"
import { useConfidentialStore } from "./useConfidentialStore"
import { RevealCommittee } from "./RevealCommittee"

interface Props {
  address: string
  symbol: string
  /** Optional override for testing or sensitive screens. */
  revealTtlMs?: number
}

function fmtTimeLeft(ms: number): string {
  if (ms <= 0) return "0s"
  const s = Math.ceil(ms / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

export function ConfidentialBalanceRow({ address, symbol, revealTtlMs }: Props) {
  const { balance, loading, error, session, reveal, hide, refresh } = useFHEBalance({
    address,
    symbol,
    revealTtlMs,
  })
  const [modalOpen, setModalOpen] = useState(false)
  const [, force] = useState(0)

  // Subscribe to store changes (revealedBalances).
  useConfidentialStore()

  const revealed = balance
    ? confidentialStore.getRevealedBalance(balance.chainId, balance.address, balance.symbol)
    : undefined

  // 1Hz tick to drive the TTL countdown (only while revealed).
  useEffect(() => {
    if (!revealed) return
    const t = setInterval(() => force((n) => n + 1), 1000)
    return () => clearInterval(t)
  }, [revealed])

  // Auto-close modal when reveal completes.
  useEffect(() => {
    if (revealed && modalOpen) setModalOpen(false)
  }, [revealed, modalOpen])

  const onReveal = () => {
    setModalOpen(true)
    void reveal()
  }

  const ciphertextPreview = balance?.ciphertext
    ? `${balance.ciphertext.slice(0, 10)}…${balance.ciphertext.slice(-6)}`
    : "—"

  const ringStyle: CSSProperties = {
    ...layout.card,
    cursor: revealed ? "default" : "pointer",
    borderColor: revealed ? colors.accent : colors.border,
  }

  return (
    <>
      <div
        style={ringStyle}
        onClick={revealed ? undefined : onReveal}
        role="button"
        aria-label={revealed ? `${symbol} revealed` : `${symbol} hidden — tap to reveal`}
      >
        <div style={layout.row}>
          <div style={{ ...layout.col, gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 18 }}>{revealed ? UNLOCK : LOCK}</span>
              <strong style={text.h3}>{symbol}</strong>
              <span style={layout.badge}>F-CHAIN</span>
            </div>
            <span style={{ ...text.muted, fontFamily: layout.mono.fontFamily, fontSize: 11 }}>
              {address.slice(0, 8)}…{address.slice(-6)}
            </span>
          </div>
          <div style={{ ...layout.col, alignItems: "flex-end", gap: 4 }}>
            {loading && <span style={text.muted}>fetching…</span>}
            {!loading && !revealed && (
              <>
                <span style={text.hidden}>●●●●●●●●</span>
                <span style={text.muted}>Hidden — tap to reveal</span>
              </>
            )}
            {revealed && (
              <>
                <strong style={{ fontSize: 18 }}>
                  {revealed.amount} {revealed.symbol}
                </strong>
                <span style={text.muted}>
                  {revealed.threshold} · re-hides in {fmtTimeLeft(revealed.expiresAt - Date.now())}
                </span>
              </>
            )}
          </div>
        </div>
        <div style={{ ...layout.row, marginTop: 12 }}>
          <span style={{ ...text.muted, ...layout.mono }}>cipher: {ciphertextPreview}</span>
          <div style={{ display: "flex", gap: 8 }}>
            {revealed ? (
              <button
                style={layout.buttonGhost}
                onClick={(e) => {
                  e.stopPropagation()
                  hide()
                }}
              >
                Re-hide
              </button>
            ) : null}
            <button
              style={layout.buttonGhost}
              onClick={(e) => {
                e.stopPropagation()
                void refresh()
              }}
            >
              Refresh
            </button>
          </div>
        </div>
        {error ? (
          <div style={{ ...layout.warn, marginTop: 12, marginBottom: 0 }}>{error}</div>
        ) : null}
      </div>
      {modalOpen ? (
        <RevealCommittee session={session} onClose={() => setModalOpen(false)} />
      ) : null}
    </>
  )
}
