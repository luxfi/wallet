/**
 * AppShell — top nav with brand + account + ChainSwitcher, side drawer
 * with primary screen links. Renders the routed `<Outlet>` in the main
 * column.
 *
 * Layout: top bar (sticky) + side drawer (collapsible on mobile) + content.
 * Styled with CSS custom properties from the brand theme. No @hanzo/gui
 * primitives wired yet — see `GuiProvider.tsx` for the upstream blocker.
 *
 * Address truncation is the only cosmetic quirk: `0x1234…abcd` for EVM,
 * full string for non-EVM (P-Chain bech32 already short).
 */
import { NavLink, Outlet } from "react-router-dom"
import { useAccount } from "../hooks/useAccount"
import { useBrand } from "../hooks/useBrand"
import { useAppStore } from "../store"
import { ChainSwitcher } from "./ChainSwitcher"

interface NavItem {
  to: string
  label: string
}

const NAV_ITEMS: NavItem[] = [
  { to: "/portfolio", label: "Portfolio" },
  { to: "/send", label: "Send" },
  { to: "/receive", label: "Receive" },
  { to: "/swap", label: "Swap" },
  { to: "/bridge", label: "Bridge" },
  { to: "/stake", label: "Stake" },
  { to: "/dapps", label: "DApps" },
  { to: "/confidential", label: "Confidential" },
  { to: "/settings", label: "Settings" },
]

function truncateAddress(addr: string): string {
  if (addr.length <= 14) return addr
  if (addr.startsWith("0x") && addr.length === 42) {
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`
  }
  // P-Chain / X-Chain / other: show first 8 + last 4.
  return `${addr.slice(0, 8)}…${addr.slice(-4)}`
}

export function AppShell(): React.JSX.Element {
  const brand = useBrand()
  const account = useAccount()
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const setSidebarOpen = useAppStore((s) => s.setSidebarOpen)

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateRows: "56px 1fr",
        background: "var(--surface1, #000)",
        color: "var(--neutral1, #fff)",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
          borderBottom: "1px solid var(--surface3, #222)",
          background: "var(--surface1, #000)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            type="button"
            aria-label="Toggle navigation"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: "transparent",
              border: "1px solid var(--surface3, #222)",
              color: "inherit",
              borderRadius: 6,
              padding: "4px 8px",
              cursor: "pointer",
            }}
          >
            ☰
          </button>
          {brand.logoUrl ? (
            <img src={brand.logoUrl} alt="" width={24} height={24} aria-hidden="true" />
          ) : null}
          <strong style={{ fontSize: 16 }}>{brand.walletName || "Lux Wallet"}</strong>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <ChainSwitcher />
          <span
            style={{
              padding: "6px 10px",
              borderRadius: 8,
              background: "var(--surface2, #111)",
              border: "1px solid var(--surface3, #222)",
              fontSize: 13,
              fontFamily: "ui-monospace, SFMono-Regular, monospace",
            }}
            aria-label="Active account"
          >
            {account.address ? truncateAddress(account.address) : "Not connected"}
          </span>
        </div>
      </header>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: sidebarOpen ? "220px 1fr" : "0 1fr",
          transition: "grid-template-columns 200ms ease",
        }}
      >
        <nav
          aria-label="Primary"
          style={{
            overflow: "hidden",
            borderRight: sidebarOpen ? "1px solid var(--surface3, #222)" : "none",
            background: "var(--surface2, #0c0c0c)",
          }}
        >
          <ul style={{ listStyle: "none", padding: 12, margin: 0, display: "grid", gap: 4 }}>
            {NAV_ITEMS.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  style={({ isActive }) => ({
                    display: "block",
                    padding: "8px 12px",
                    borderRadius: 6,
                    color: isActive ? "var(--accent1, #fff)" : "var(--neutral2, #888)",
                    background: isActive ? "var(--surface3, #1a1a1a)" : "transparent",
                    textDecoration: "none",
                    fontSize: 14,
                  })}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <main style={{ padding: 24, minWidth: 0 }}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
