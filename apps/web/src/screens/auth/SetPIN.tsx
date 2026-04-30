/**
 * Set a 6-digit PIN, hashed with scrypt. Two-step: enter, then confirm.
 * Storing fails closed if either entry is not exactly 6 digits.
 *
 * On success, encrypts the draft mnemonic, stores credentials, clears the
 * draft, and routes to /portfolio.
 */
import { useState } from "react"
import { useNavigate, Navigate } from "react-router-dom"
import { Button, Card, Input, YStack, Text } from "@hanzo/gui"
import { useAuth } from "../../store/auth"
import { useMnemonicDraft } from "./mnemonicDraft"

const PIN_RE = /^\d{6}$/

export default function SetPIN() {
  const navigate = useNavigate()
  const draft = useMnemonicDraft((s) => s.mnemonic)
  const clearDraft = useMnemonicDraft((s) => s.clear)
  const setCredentials = useAuth((s) => s.setCredentials)

  const [pin, setPin] = useState("")
  const [confirm, setConfirm] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!draft) return <Navigate to="/auth" replace />

  const valid = PIN_RE.test(pin) && pin === confirm

  const onSubmit = async () => {
    if (!valid || busy) return
    setBusy(true)
    setError(null)
    try {
      await setCredentials(draft, pin)
      clearDraft()
      navigate("/portfolio", { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save credentials")
      setBusy(false)
    }
  }

  return (
    <YStack flex={1} p="$5" gap="$5" maxWidth={420} mx="auto">
      <Text fontSize="$8" fontWeight="700">
        Set a PIN
      </Text>
      <Text col="$neutral2">
        6 digits. Used to unlock the wallet on subsequent visits. Pick something
        you can remember — there is no "forgot PIN" button. If you lose it,
        recover with your phrase.
      </Text>

      <Card p="$4">
        <YStack gap="$3">
          <Input
            inputMode="numeric"
            secureTextEntry
            maxLength={6}
            placeholder="6-digit PIN"
            value={pin}
            onChangeText={(v: string) => setPin(v.replace(/\D/g, ""))}
          />
          <Input
            inputMode="numeric"
            secureTextEntry
            maxLength={6}
            placeholder="Confirm PIN"
            value={confirm}
            onChangeText={(v: string) => setConfirm(v.replace(/\D/g, ""))}
          />
          {pin && !PIN_RE.test(pin) ? (
            <Text col="$red10" fontSize="$2">
              PIN must be exactly 6 digits.
            </Text>
          ) : null}
          {confirm && pin !== confirm ? (
            <Text col="$red10" fontSize="$2">
              PINs do not match.
            </Text>
          ) : null}
          {error ? (
            <Text col="$red10" fontSize="$2">
              {error}
            </Text>
          ) : null}
        </YStack>
      </Card>

      <Button disabled={!valid || busy} onPress={onSubmit} theme="active">
        {busy ? "Encrypting..." : "Create wallet"}
      </Button>
    </YStack>
  )
}
