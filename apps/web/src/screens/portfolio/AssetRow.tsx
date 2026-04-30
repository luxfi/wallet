/**
 * Single asset row — symbol, name, balance, USD. Clickable → AssetDetail.
 *
 * Confidential balances (balance === "hidden") render as "Hidden 🔒" with a
 * Reveal action that the consumer wires to the F-Chain unwrap flow.
 */
import { Card, Text, XStack, YStack } from "@hanzo/gui"
import type { TokenBalance } from "../../store/portfolio"

interface AssetRowProps {
  asset: TokenBalance
  onPress?: () => void
  onReveal?: () => void
}

export default function AssetRow({ asset, onPress, onReveal }: AssetRowProps) {
  const isHidden = asset.balance === "hidden"
  const balanceDisplay = isHidden ? "Hidden 🔒" : formatBalance(asset.balance, asset.decimals)
  const usdDisplay =
    isHidden ? "—" : asset.usd !== undefined ? `$${asset.usd.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : ""

  return (
    <Card p="$3" pressStyle={onPress ? { scale: 0.98 } : undefined} onPress={onPress}>
      <XStack ai="center" jc="space-between">
        <YStack>
          <Text fontSize="$5" fontWeight="600">
            {asset.symbol}
          </Text>
          <Text fontSize="$2" col="$neutral2">
            {asset.name}
          </Text>
        </YStack>
        <YStack ai="flex-end">
          <Text fontSize="$5" fontWeight="600">
            {balanceDisplay}
          </Text>
          <Text fontSize="$2" col="$neutral2">
            {usdDisplay}
          </Text>
          {isHidden && onReveal ? (
            <Text fontSize="$2" col="$accent1" onPress={onReveal} cursor="pointer">
              Reveal
            </Text>
          ) : null}
        </YStack>
      </XStack>
    </Card>
  )
}

function formatBalance(balance: string, decimals: number): string {
  // Render up to 6 significant digits in the major unit.
  const n = Number(balance)
  if (!Number.isFinite(n)) return balance
  if (n === 0) return "0"
  const places = n < 0.01 ? 6 : n < 1 ? 4 : 2
  return n.toLocaleString(undefined, { maximumFractionDigits: Math.min(places, decimals) })
}
