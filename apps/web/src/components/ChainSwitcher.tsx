/**
 * ChainSwitcher — dropdown over the offered networks (`useNetworks`): the
 * chains the brand serves whose RPC answers. A chain that is not producing
 * blocks is listed, marked unavailable and not selectable; the notice under
 * the header says why.
 *
 * Drives `useAppStore.chainId`. Wagmi's `useSwitchChain` is invoked too
 * when wagmi has a config for the chain, so wagmi-rooted hooks get the same
 * chain.
 *
 * Renders as a native `<select>` for now — deliberately minimal.
 * @hanzo/gui's `Select` will replace this once the v7 dist artifact ships;
 * the surface (controlled value, onChange) stays the same.
 */
import { useId } from "react"
import { useSwitchChain } from "wagmi"
import { useAppStore } from "../store"
import { useActiveNetwork, useNetworks } from "../hooks/useNetworks"

export function ChainSwitcher(): React.JSX.Element {
  const id = useId()
  const chainId = useAppStore((s) => s.chainId)
  const setChainId = useAppStore((s) => s.setChainId)
  const { switchChain, chains } = useSwitchChain()
  const networks = useNetworks()
  const active = useActiveNetwork(chainId)
  // The active chain is always an option, so the select shows what the store
  // holds even after its RPC stopped answering.
  const options = networks.some((n) => n.id === chainId) ? networks : [...networks, active]

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
        {options.map((n) => (
          <option key={n.id} value={n.id} disabled={!!n.unavailable}>
            {n.unavailable ? `${n.label} — unavailable` : n.label}
          </option>
        ))}
      </select>
    </label>
  )
}
