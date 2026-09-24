/**
 * ChainSwitcher — dropdown over the offered networks (`useMeasuredNetworks`):
 * the chains the brand serves whose RPC has answered. A chain that is not
 * producing blocks is listed, marked unavailable and not selectable; the
 * notice under the header says why. Once every chain has been asked, an active
 * chain that did not answer is replaced by the brand's default, or the first
 * offered chain, so the wallet never stays on a chain nothing reaches.
 *
 * Drives `useAppStore.chainId`. Wagmi's `useSwitchChain` is invoked too
 * when wagmi has a config for the chain, so wagmi-rooted hooks get the same
 * chain.
 *
 * Renders as a native `<select>` for now — deliberately minimal.
 * @hanzo/gui's `Select` will replace this once the v7 dist artifact ships;
 * the surface (controlled value, onChange) stays the same.
 */
import { useEffect, useId } from "react"
import { useSwitchChain } from "wagmi"
import { brand } from "@luxfi/wallet-brand"
import { useAppStore } from "../store"
import { useActiveNetwork, useMeasuredNetworks } from "../hooks/useNetworks"

export function ChainSwitcher(): React.JSX.Element {
  const id = useId()
  const chainId = useAppStore((s) => s.chainId)
  const setChainId = useAppStore((s) => s.setChainId)
  const { switchChain, chains } = useSwitchChain()
  const { list: networks, settled } = useMeasuredNetworks()
  const active = useActiveNetwork(chainId)
  // The active chain is always an option, so the select shows what the store
  // holds while it is being asked.
  const listed = networks.some((n) => n.id === chainId)
  const options = listed ? networks : [...networks, active]

  const select = (next: number) => {
    setChainId(next)
    // If wagmi has a chain config for this id, ask the connector to switch.
    if (chains.some((c) => c.id === next)) {
      switchChain({ chainId: next })
    }
  }

  const fallback = (networks.find((n) => n.id === brand.defaultChainId) ?? networks[0])?.id
  useEffect(() => {
    if (settled && !listed && fallback !== undefined) select(fallback)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled, listed, fallback])

  const onChange = (e: React.ChangeEvent<HTMLSelectElement>) => select(Number(e.target.value))

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
        {options.map((n) => (
          <option key={n.id} value={n.id} disabled={!!n.unavailable}>
            {n.unavailable ? `${n.label} — unavailable` : n.label}
          </option>
        ))}
      </select>
    </label>
  )
}
