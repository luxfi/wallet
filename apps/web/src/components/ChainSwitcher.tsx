/**
 * ChainSwitcher — dropdown over `brand.supportedChainIds`.
 *
 * Drives `useAppStore.chainId`. Wagmi's `useSwitchChain` is invoked too
 * when the active address is an EVM account, so wagmi-rooted hooks get
 * the same chain. Non-EVM (P/X/Solana) ids set the store only.
 *
 * Renders as a native `<select>` for now — deliberately minimal.
 * @hanzo/gui's `Select` will replace this once the v7 dist artifact ships;
 * the surface (controlled value, onChange) stays the same.
 */
import { useId } from "react"
import { useSwitchChain } from "wagmi"
import { useAppStore } from "../store"
import { useBrand } from "../hooks/useBrand"

const CHAIN_LABELS: Record<number, string> = {
  1: "Ethereum",
  137: "Polygon",
  8453: "Base",
  42161: "Arbitrum",
  43114: "Avalanche",
  96369: "Lux C-Chain",
  96368: "Lux Testnet",
  200200: "Zoo L1",
  36963: "Hanzo L1",
  36911: "Q-Chain",
  494949: "F-Chain",
}

export function ChainSwitcher(): React.JSX.Element {
  const id = useId()
  const brand = useBrand()
  const chainId = useAppStore((s) => s.chainId)
  const setChainId = useAppStore((s) => s.setChainId)
  const { switchChain, chains } = useSwitchChain()

  const supported = brand.supportedChainIds.length
    ? brand.supportedChainIds
    : [brand.defaultChainId]

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const next = Number(e.target.value)
    setChainId(next)
    // If wagmi has a chain config for this id, ask the connector to switch.
    if (chains.some((c) => c.id === next)) {
      switchChain({ chainId: next })
    }
  }

  return (
    <label htmlFor={id} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span style={{ color: "var(--neutral2, #888)", fontSize: 12 }}>Chain</span>
      <select
        id={id}
        value={chainId}
        onChange={onChange}
        style={{
          padding: "6px 10px",
          borderRadius: 8,
          background: "var(--surface2, #111)",
          color: "var(--neutral1, #fff)",
          border: "1px solid var(--surface3, #222)",
          fontSize: 14,
        }}
      >
        {supported.map((cid) => (
          <option key={cid} value={cid}>
            {CHAIN_LABELS[cid] ?? `Chain ${cid}`}
          </option>
        ))}
      </select>
    </label>
  )
}
