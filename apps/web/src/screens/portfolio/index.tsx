/**
 * Portfolio screen — Foundation placeholder.
 *
 * Owned by Auth-Portfolio Blue. This stub renders so the router builds clean
 * before that Blue merges. Replace this file with the full SCREENS.md §1
 * Account / Portfolio implementation.
 */
import { useBrand } from "../../hooks/useBrand"
import { useAccount } from "../../hooks/useAccount"

export default function Portfolio(): React.JSX.Element {
  const brand = useBrand()
  const account = useAccount()
  return (
    <section>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Portfolio</h1>
      <p style={{ color: "var(--neutral2, #888)" }}>
        {account.connected
          ? `Connected: ${account.address}`
          : `Welcome to ${brand.walletName || "Lux Wallet"}. Foundation placeholder — Auth-Portfolio Blue ships the real screen.`}
      </p>
    </section>
  )
}
