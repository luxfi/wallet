/**
 * Create-wallet step 1: generate a fresh BIP-39 mnemonic and display it
 * for backup. Word display is grid-of-12 with index labels. The user must
 * acknowledge they have written it down before proceeding to confirmation.
 *
 * Mnemonic source: viem's generateMnemonic (BIP-39). Held in component
 * state only; persisted only after PIN setup completes via auth.setCredentials.
 */
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { generateMnemonic, english } from "viem/accounts"
import { Button, Card, Stack, Text, XStack, YStack } from "@hanzo/gui/web"
import { useMnemonicDraft } from "./mnemonicDraft"

export default function CreateMnemonic() {
  const navigate = useNavigate()
  const setDraft = useMnemonicDraft((s) => s.set)
  // Generated once per mount. Re-mount to regenerate (Welcome → Create).
  const mnemonic = useMemo(() => generateMnemonic(english), [])
  const words = mnemonic.split(" ")
  const [acknowledged, setAcknowledged] = useState(false)

  const onContinue = () => {
    setDraft(mnemonic)
    navigate("/auth/confirm")
  }

  return (
    <YStack flex={1} p="$5" gap="$5" maxWidth={520} mx="auto">
      <Text fontSize="$8" fontWeight="700">
        Backup your recovery phrase
      </Text>
      <Text col="$neutral2">
        Write down these 12 words in order and keep them somewhere safe. Anyone
        with this phrase controls your wallet. Lux cannot recover it for you.
      </Text>

      <Card p="$4">
        <Stack flexWrap="wrap" flexDirection="row" gap="$2">
          {words.map((word, i) => (
            <XStack
              key={i}
              ai="center"
              gap="$2"
              p="$2"
              br="$3"
              bw={1}
              boc="$neutral3"
              flexBasis="32%"
            >
              <Text col="$neutral3" fontSize="$2" width={20}>
                {i + 1}.
              </Text>
              <Text fontSize="$4" fontWeight="600">
                {word}
              </Text>
            </XStack>
          ))}
        </Stack>
      </Card>

      <XStack ai="center" gap="$3">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
        />
        <Text>I have written down my recovery phrase.</Text>
      </XStack>

      <Button disabled={!acknowledged} onPress={onContinue} theme="active">
        Continue
      </Button>
    </YStack>
  )
}
