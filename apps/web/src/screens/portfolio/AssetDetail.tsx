/**
 * Asset detail drawer. Opens on row tap; exits on backdrop press or Esc.
 *
 * Hour-1 scope: full balance, send/receive shortcuts. Activity feed wires
 * to the indexer in a later slice; here we render "No recent activity"
 * rather than a fake feed.
 */
import { Button, Card, Text, XStack, YStack } from "@hanzo/gui/web"
import { useNavigate, useParams } from "react-router-dom"
import { usePortfolio, type TokenBalance } from "../../store/portfolio"

function findAsset(perChain: ReturnType<typeof usePortfolio.getState>["perChain"], address: string): TokenBalance | null {
  for (const c of perChain) {
    if (c.native.address === address) return c.native
    const t = c.tokens.find((x) => x.address === address)
    if (t) return t
  }
  return null
}

export default function AssetDetail() {
  const { address = "native" } = useParams<{ address: string }>()
  const navigate = useNavigate()
  const perChain = usePortfolio((s) => s.perChain)
  const asset = findAsset(perChain, address)

  const onClose = () => navigate("/portfolio")

  if (!asset) {
    return (
      <YStack p="$5" gap="$4">
        <Text fontSize="$6" fontWeight="700">
          Asset not found
        </Text>
        <Button onPress={onClose}>Back</Button>
      </YStack>
    )
  }

  return (
    <YStack p="$5" gap="$5" maxWidth={520} mx="auto">
      <XStack jc="space-between" ai="center">
        <Text fontSize="$8" fontWeight="700">
          {asset.symbol}
        </Text>
        <Button variant="outlined" size="$2" onPress={onClose}>
          Close
        </Button>
      </XStack>

      <Card p="$4">
        <YStack gap="$2">
          <Text col="$neutral2">Balance</Text>
          <Text fontSize="$8" fontWeight="700">
            {asset.balance === "hidden" ? "Hidden 🔒" : asset.balance}
          </Text>
          {asset.usd !== undefined ? (
            <Text col="$neutral2">${asset.usd.toLocaleString(undefined, { maximumFractionDigits: 2 })}</Text>
          ) : null}
        </YStack>
      </Card>

      <XStack gap="$3">
        <Button flex={1} theme="active" onPress={() => navigate("/send", { state: { from: asset.address } })}>
          Send
        </Button>
        <Button flex={1} variant="outlined" onPress={() => navigate("/receive")}>
          Receive
        </Button>
      </XStack>

      <Card p="$4">
        <YStack gap="$2">
          <Text fontSize="$5" fontWeight="600">
            Recent activity
          </Text>
          <Text col="$neutral2">No recent activity.</Text>
        </YStack>
      </Card>
    </YStack>
  )
}
