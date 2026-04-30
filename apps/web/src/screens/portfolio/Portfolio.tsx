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
import { useNavigate } from "react-router-dom"
import { mnemonicToAccount, type Address } from "viem/accounts"
import { Button, Card, Stack, Text, XStack, YStack } from "@hanzo/gui/web"
import { useAuth } from "../../store/auth"
import { CHAINS, useChainBalances } from "./useChainBalances"
import { useTotalUSD } from "./useTotalUSD"
import { usePerLLMTokens } from "./usePerLLMTokens"
import AssetRow from "./AssetRow"

// Foundation slice owns ChainSwitcher. Lazy import keeps this slice
// buildable in isolation; the catch falls back to a small placeholder
// so the page still renders during partial deploys.
const ChainSwitcher = lazy(() =>
  import("../../components/ChainSwitcher").catch(() => ({
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
      const account = mnemonicToAccount(mnemonic, { path: "m/44'/60'/0'/0/0" })
      return account.address
    } catch {
      return undefined
    }
  }, [mnemonic])
}

/** Active chain id. Foundation will replace with a `useAppStore` selector. */
function useActiveChainId(): number {
  return 96369
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

      <Suspense fallback={null}>
        <ChainSwitcher />
      </Suspense>

      <Stack gap="$2">
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
      </Stack>

      {perLLM.length > 0 && chainId === 200200 ? (
        <Stack gap="$2">
          <Text fontSize="$5" fontWeight="600">
            Per-LLM tokens
          </Text>
          {perLLM.map((t) => (
            <AssetRow key={t.address} asset={t} onPress={() => onRowPress(t.address)} />
          ))}
        </Stack>
      ) : null}

      {otherChains.length > 0 ? (
        <Stack gap="$2">
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
        </Stack>
      ) : null}
    </YStack>
  )
}
