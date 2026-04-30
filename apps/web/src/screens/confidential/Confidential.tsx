/**
 * Confidential landing screen.
 *
 * Renders:
 *   - A list of F-Chain encrypted balances (hidden by default).
 *   - Quick links to the Confidential transfer flow (F-Chain) and the ZK
 *     proof generator (Z-Chain).
 *
 * The address list is supplied via the `addresses` prop. Foundation passes
 * the connected wallet's F-Chain addresses in once it has established a
 * signing session. The default is an empty list so the screen renders even
 * before connect.
 */

import { Link } from "react-router-dom"
import { ConfidentialBalanceRow } from "./ConfidentialBalanceRow"
import { colors, layout, text } from "./styles"
import { useConfidentialStore } from "./useConfidentialStore"
import { confidentialStore } from "../../store/confidential"

interface Props {
  addresses?: string[]
  symbols?: string[]
}

export function Confidential({
  addresses = [],
  symbols = ["LUX", "ZOO", "AI"],
}: Props) {
  // Subscribe so the active proof count updates live.
  useConfidentialStore()
  const proofCount = confidentialStore.listProofs().length

  return (
    <div style={layout.page}>
      <div style={layout.container}>
        <div style={layout.header}>
          <h1 style={text.h1}>Confidential</h1>
          <Link to="/" style={{ ...layout.buttonGhost, textDecoration: "none" }}>
            Back to wallet
          </Link>
        </div>

        <p style={{ ...text.muted, marginBottom: 16 }}>
          F-Chain encrypts balances and transfer amounts (LP-013). Z-Chain proves
          claims about you without revealing the underlying data (LP-063).
        </p>

        <div style={{ ...layout.row, marginBottom: 24, gap: 8, flexWrap: "wrap" }}>
          <Link to="/confidential/transfer" style={{ ...layout.button, textDecoration: "none" }}>
            Send confidential
          </Link>
          <Link to="/confidential/zk" style={{ ...layout.buttonGhost, textDecoration: "none" }}>
            Generate ZK proof
          </Link>
          {proofCount > 0 ? (
            <span style={{ ...text.muted, marginLeft: "auto" }}>
              {proofCount} active proof{proofCount === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>

        <h2 style={{ ...text.h2, marginBottom: 8 }}>Encrypted balances</h2>
        <p style={{ ...text.muted, marginBottom: 16 }}>
          Tap a row to start a threshold-decrypt session.
        </p>

        {addresses.length === 0 ? (
          <div style={layout.card}>
            <p style={text.body}>No F-Chain addresses connected.</p>
            <p style={{ ...text.muted, marginTop: 4 }}>
              Connect a wallet from the main view to see encrypted balances.
            </p>
          </div>
        ) : (
          <>
            {addresses.flatMap((addr) =>
              symbols.map((sym) => (
                <ConfidentialBalanceRow
                  key={`${addr}:${sym}`}
                  address={addr}
                  symbol={sym}
                />
              )),
            )}
          </>
        )}

        <div style={{ ...layout.card, marginTop: 24, borderColor: colors.borderHi }}>
          <div style={text.h3}>Privacy guarantees</div>
          <ul style={{ ...text.muted, paddingLeft: 18, marginTop: 8, lineHeight: 1.7 }}>
            <li>Balances and amounts encrypted under TFHE — validators see only ciphertext.</li>
            <li>Reveal requires a threshold of MPC committee signatures (e.g. 3-of-5).</li>
            <li>Plaintext lives in memory for 30 seconds, then auto re-hides.</li>
            <li>ZK proofs reveal only the claim — never the underlying witness.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
