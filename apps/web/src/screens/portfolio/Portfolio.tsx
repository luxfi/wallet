/**
 * Portfolio main view. Default landing for unlocked sessions.
 *
 * Layout (mobile-first):
 *   - Header: total USD value + chain switcher (foundation-owned).
 *   - Active-chain assets: native + tokens.
 *   - Per-LLM tokens (Zoo only).
 *   - Other-chain native rollup, with confidential rows hidden behind
 *     "Hidden 🔒 / Reveal".
 *
 * Foundation contract:
 *   - `useAccount()` from `../../hooks/useAccount` — single source of truth
 *      for the active address (wagmi + non-EVM store overrides).
 *   - `useAppStore` selector for the active chain id.
 *   - `<ChainSwitcher>` from `../../components/ChainSwitcher`.
 *
 * If foundation hasn't landed yet, the lazy fallbacks render small
 * placeholders rather than crashing the screen.
 */
import { lazy, Suspense, useMemo } from "react"
import { Link, useNavigate } from "react-router-dom"
import { type Address } from "viem/accounts"
import { Button, Card, Text, XStack, YStack } from "@hanzo/gui"
import { useAuth } from "../../store/auth"
import { evmAccount } from "../../lib/chain-evm"
import { CHAINS, useChainBalances } from "./useChainBalances"
import { useTotalUSD } from "./useTotalUSD"
import { usePerLLMTokens } from "./usePerLLMTokens"
import AssetRow from "./AssetRow"

// Foundation slice owns ChainSwitcher. Lazy import keeps this slice
// buildable in isolation; the catch falls back to a small placeholder
// so the page still renders during partial deploys.
const ChainSwitcher = lazy(() =>
  import("../../components/ChainSwitcher").then((m: any) => ({
    default: m.default ?? m.ChainSwitcher ?? (() => (
      <Text col="$neutral2" fontSize="$2">
        chain switcher (foundation)
      </Text>
    )),
  })).catch(() => ({
    default: () => (
      <Text col="$neutral2" fontSize="$2">
        chain switcher (foundation)
      </Text>
    ),
  })),
)

/** Foundation owns the canonical address hook; this is the local fallback
 * derived deterministically from the unlocked mnemonic so the page is
 * useful before foundation lands. */
function useDerivedAddress(): Address | undefined {
  const mnemonic = useAuth((s) => s.mnemonic)
  return useMemo(() => {
    if (!mnemonic) return undefined
    try {
      return evmAccount(mnemonic).address
    } catch {
      return undefined
    }
  }, [mnemonic])
}

/** Active chain id. Foundation will replace with a `useAppStore` selector. */
function useActiveChainId(): number {
  return 96369
}

/**
 * Dashboard quick actions. Each is a react-router <Link> (SPA soft-nav) — NOT
 * an <a href>. The unlock state + plaintext mnemonic live ONLY in memory (the
 * auth store never persists them), so a full document reload wipes them and
 * bounces the user back to onboarding. Soft-nav keeps the session alive.
 */
const QUICK_ACTIONS: ReadonlyArray<{ to: string; label: string; icon: string }> = [
  { to: "/send", label: "Send", icon: "↑" },
  { to: "/bridge", label: "Cross-Chain", icon: "⇄" },
  { to: "/stake", label: "Earn", icon: "%" },
  { to: "/settings/security", label: "Manage Keys", icon: "⚿" },
]

const quickActionStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  minWidth: 0,
  padding: "14px 6px",
  borderRadius: 12,
  border: "1px solid var(--surface3, #222)",
  background: "var(--surface2, #111)",
  color: "var(--neutral1, #fff)",
  textDecoration: "none",
  textAlign: "center",
}

export default function Portfolio() {
  const navigate = useNavigate()
  const isUnlocked = useAuth((s) => s.isUnlocked)
  const hasCreds = useAuth((s) => s.encryptedMnemonic !== null)
  const address = useDerivedAddress()
  const chainId = useActiveChainId()
  const { perChain, isLoading, refresh } = useChainBalances(address)
  const { totalUSD } = useTotalUSD()
  const perLLM = usePerLLMTokens(chainId, address)

  // First-launch onboarding: no credentials yet → send to /auth.
  if (!hasCreds) {
    navigate("/auth", { replace: true })
    return null
  }
  // Returning user but locked → /auth/unlock.
  if (!isUnlocked) {
    navigate("/auth/unlock", { replace: true })
    return null
  }

  const activeChain = perChain.find((c) => c.chainId === chainId)
  const otherChains = perChain.filter((c) => c.chainId !== chainId)

  const onRowPress = (assetAddr: string) => navigate(`/portfolio/${assetAddr}`)
  const onRevealConfidential = () => navigate("/confidential")

  return (
    <YStack flex={1} p="$5" gap="$5" maxWidth={520} mx="auto">
      <XStack jc="space-between" ai="center">
        <Text fontSize="$6" fontWeight="700">
          Portfolio
        </Text>
        <Button size="$2" variant="outlined" onPress={refresh} disabled={isLoading}>
          {isLoading ? "Refreshing..." : "Refresh"}
        </Button>
      </XStack>

      <Card p="$5">
        <YStack gap="$1">
          <Text col="$neutral2">Total value (USD)</Text>
          <Text fontSize="$10" fontWeight="700">
            ${totalUSD.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </Text>
          {address ? (
            <Text col="$neutral3" fontSize="$2">
              {address.slice(0, 6)}…{address.slice(-4)}
            </Text>
          ) : null}
        </YStack>
      </Card>

      <nav
        aria-label="Quick actions"
        style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}
      >
        {QUICK_ACTIONS.map((a) => (
          <Link key={a.to} to={a.to} style={quickActionStyle}>
            <span aria-hidden="true" style={{ fontSize: 20, lineHeight: 1 }}>
              {a.icon}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600 }}>{a.label}</span>
          </Link>
        ))}
      </nav>

      <Suspense fallback={null}>
        <ChainSwitcher />
      </Suspense>

      <YStack gap="$2">
        <Text fontSize="$5" fontWeight="600">
          Assets
        </Text>
        {activeChain ? (
          <AssetRow asset={activeChain.native} onPress={() => onRowPress(activeChain.native.address)} />
        ) : (
          <Text col="$neutral2">No balances yet.</Text>
        )}
        {activeChain?.tokens.map((t) => (
          <AssetRow key={t.address} asset={t} onPress={() => onRowPress(t.address)} />
        ))}
      </YStack>

      {perLLM.length > 0 && chainId === 200200 ? (
        <YStack gap="$2">
          <Text fontSize="$5" fontWeight="600">
            Per-LLM tokens
          </Text>
          {perLLM.map((t) => (
            <AssetRow key={t.address} asset={t} onPress={() => onRowPress(t.address)} />
          ))}
        </YStack>
      ) : null}

      {otherChains.length > 0 ? (
        <YStack gap="$2">
          <Text fontSize="$5" fontWeight="600">
            Other chains
          </Text>
          {otherChains.map((c) => {
            const isHidden = CHAINS.find((e) => e.chainId === c.chainId)?.kind === "fhe"
            return (
              <AssetRow
                key={c.chainId}
                asset={c.native}
                onPress={() => onRowPress(c.native.address)}
                onReveal={isHidden ? onRevealConfidential : undefined}
              />
            )
          })}
        </YStack>
      ) : null}
    </YStack>
  )
}
