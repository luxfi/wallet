/**
 * Import-existing-wallet path. User pastes a 12 or 24-word BIP-39 mnemonic;
 * we validate against the BIP-39 wordlist + checksum via viem's
 * `validateMnemonic`. On success, store the draft and proceed to PIN setup.
 */
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { english, validateMnemonic } from "viem/accounts"
import { Button, Card, Input, Stack, Text, YStack } from "@hanzo/gui/web"
import { useMnemonicDraft } from "./mnemonicDraft"

export default function ImportMnemonic() {
  const navigate = useNavigate()
  const setDraft = useMnemonicDraft((s) => s.set)
  const [phrase, setPhrase] = useState("")

  const normalized = useMemo(() => phrase.trim().replace(/\s+/g, " ").toLowerCase(), [phrase])
  const wordCount = normalized ? normalized.split(" ").length : 0
  const validShape = wordCount === 12 || wordCount === 24
  const validBip39 = validShape && validateMnemonic(normalized, english)

  const onContinue = () => {
    if (!validBip39) return
    setDraft(normalized)
    // Skip the confirmation quiz on import — user already has the phrase.
    navigate("/auth/pin")
  }

  return (
    <YStack flex={1} p="$5" gap="$5" maxWidth={520} mx="auto">
      <Text fontSize="$8" fontWeight="700">
        Import wallet
      </Text>
      <Text col="$neutral2">Paste your 12 or 24-word BIP-39 recovery phrase.</Text>

      <Card p="$4">
        <Stack gap="$3">
          <Input
            multiline
            numberOfLines={4}
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="word word word ..."
            value={phrase}
            onChangeText={setPhrase}
          />
          {phrase && !validShape ? (
            <Text col="$red10" fontSize="$2">
              Phrase must be exactly 12 or 24 words ({wordCount} entered).
            </Text>
          ) : null}
          {validShape && !validBip39 ? (
            <Text col="$red10" fontSize="$2">
              Phrase failed BIP-39 checksum. Check for typos.
            </Text>
          ) : null}
        </Stack>
      </Card>

      <Button disabled={!validBip39} onPress={onContinue} theme="active">
        Continue
      </Button>
    </YStack>
  )
}
