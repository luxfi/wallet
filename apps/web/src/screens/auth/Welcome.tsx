/**
 * First-launch splash. Two paths: create new wallet, or import existing.
 * Foundation router mounts this at /auth.
 */
import { Link } from "react-router-dom"
import { Button, Card, Text, YStack } from "@hanzo/gui"
import { brand, getIamConfig } from "@luxfi/wallet-brand"
import { useSession } from "../../store/session"

export default function Welcome() {
  const login = useSession((s) => s.login)
  const status = useSession((s) => s.status)
  // Account login is additive — only offered when the brand has an IdP wired.
  const { issuer, clientId } = getIamConfig()
  const accountLoginEnabled = Boolean(issuer && clientId)
  const idpName = brand.shortName || brand.name || "Lux"

  return (
    <YStack flex={1} ai="center" jc="center" gap="$6" p="$6">
      <Text fontSize="$10" fontWeight="700">
        {brand.walletName || "▼"}
      </Text>
      <Text fontSize="$4" col="$neutral2" ta="center" maxWidth={360}>
        {brand.description || "Self-custodial wallet for the Lux ecosystem."}
      </Text>

      <Card p="$5" maxWidth={360} width="100%">
        <YStack gap="$3">
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
          {accountLoginEnabled ? (
            <Button
              width="100%"
              variant="outlined"
              disabled={status === "loading"}
              // Self-custody keys stay local; this adds a cloud account
              // (lux.id) for sync + MPC custody. Navigates to the IdP.
              onPress={() => {
                void login()
              }}
            >
              {status === "loading" ? "Connecting…" : `Sign in with ${idpName}`}
            </Button>
          ) : null}
        </YStack>
      </Card>
    </YStack>
  )
}
