/**
 * Unlock screen. PIN is the canonical authenticator. Passkey, when present,
 * is a UX accelerator that proves possession of the device — the actual key
 * material still derives from the PIN; passkey only releases a cached PIN
 * stored under the platform authenticator.
 *
 * For now (Hour 1) we ship the PIN path only. The passkey hook is wired but
 * gracefully no-ops when WebAuthn is unavailable or no credential is registered.
 */
import { useState } from "react"
import { useNavigate, Navigate } from "react-router-dom"
import { Button, Card, Input, YStack, Text } from "@hanzo/gui"
import { useAuth } from "../../store/auth"

const PIN_RE = /^\d{6}$/

async function tryPasskey(): Promise<string | null> {
  // Optional UX accelerator. If WebAuthn isn't available or no credential is
  // registered, return null and fall through to manual PIN entry.
  if (typeof navigator === "undefined" || !navigator.credentials) return null
  // Platform-bound passkey discovery. We don't enumerate credentials by ID —
  // we let the platform pick the discoverable one for this RP.
  try {
    const challenge = new Uint8Array(32)
    crypto.getRandomValues(challenge)
    const cred = (await navigator.credentials.get({
      publicKey: {
        challenge,
        rpId: location.hostname,
        userVerification: "required",
        timeout: 60_000,
      },
      mediation: "optional",
    })) as PublicKeyCredential | null
    if (!cred) return null
    // Real passkey-bound PIN release happens server-side or via a local
    // platform-keychain handoff. The Foundation slice will own that piece.
    // Until then, success-of-prompt is treated as "user proved presence" but
    // the PIN must still be entered. Return null to keep PIN entry required.
    return null
  } catch {
    return null
  }
}

export default function Unlock() {
  const navigate = useNavigate()
  const unlock = useAuth((s) => s.unlock)
  const hasCreds = useAuth((s) => s.encryptedMnemonic !== null && s.pinHash !== null)

  const [pin, setPin] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!hasCreds) return <Navigate to="/auth" replace />

  const onSubmit = async () => {
    if (!PIN_RE.test(pin) || busy) return
    setBusy(true)
    setError(null)
    const ok = await unlock(pin)
    if (!ok) {
      setError("Incorrect PIN")
      setBusy(false)
      setPin("")
      return
    }
    navigate("/portfolio", { replace: true })
  }

  const onBiometric = async () => {
    const cached = await tryPasskey()
    if (!cached) return
    setPin(cached)
    void onSubmit()
  }

  return (
    <YStack flex={1} ai="center" jc="center" p="$5" gap="$5">
      <Text fontSize="$8" fontWeight="700">
        Unlock wallet
      </Text>

      <Card p="$5" maxWidth={360} width="100%">
        <YStack gap="$3">
          <Input
            inputMode="numeric"
            secureTextEntry
            maxLength={6}
            placeholder="6-digit PIN"
            value={pin}
            onChangeText={(v: string) => setPin(v.replace(/\D/g, ""))}
            onSubmitEditing={onSubmit}
          />
          {error ? (
            <Text col="$red10" fontSize="$2">
              {error}
            </Text>
          ) : null}
          <Button disabled={!PIN_RE.test(pin) || busy} onPress={onSubmit} theme="active">
            {busy ? "Unlocking..." : "Unlock"}
          </Button>
          <Button variant="outlined" onPress={onBiometric}>
            Use device biometrics
          </Button>
        </YStack>
      </Card>
    </YStack>
  )
}
