/**
 * First-launch splash. Two paths: create new wallet, or import existing.
 * Foundation router mounts this at /auth.
 */
import { Link } from "react-router-dom"
import { Button, Card, Stack, Text, YStack } from "@hanzo/gui/web"
import { brand } from "@luxfi/wallet-brand"

export default function Welcome() {
  return (
    <YStack flex={1} ai="center" jc="center" gap="$6" p="$6">
      <Text fontSize="$10" fontWeight="700">
        {brand.walletName || "Lux Wallet"}
      </Text>
      <Text fontSize="$4" col="$neutral2" ta="center" maxWidth={360}>
        {brand.description || "Self-custodial wallet for the Lux ecosystem."}
      </Text>

      <Card p="$5" maxWidth={360} width="100%">
        <Stack gap="$3">
          <Link to="/auth/create" style={{ textDecoration: "none" }}>
            <Button width="100%" theme="active">
              Create new wallet
            </Button>
          </Link>
          <Link to="/auth/import" style={{ textDecoration: "none" }}>
            <Button width="100%" variant="outlined">
              Import existing
            </Button>
          </Link>
        </Stack>
      </Card>
    </YStack>
  )
}
