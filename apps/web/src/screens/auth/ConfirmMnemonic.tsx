/**
 * Quiz the user on 3 random word positions before allowing PIN setup.
 * Positions chosen ONCE per mount (deterministic during the quiz). Wrong
 * answers do not advance; correct answers unlock the Continue button.
 */
import { useMemo, useState } from "react"
import { useNavigate, Navigate } from "react-router-dom"
import { Button, Card, Input, Stack, Text, XStack, YStack } from "@hanzo/gui/web"
import { useMnemonicDraft } from "./mnemonicDraft"

function pickIndices(total: number, count: number): number[] {
  const all = Array.from({ length: total }, (_, i) => i)
  // Fisher–Yates partial shuffle, take first `count`.
  for (let i = 0; i < count; i++) {
    const j = i + Math.floor(Math.random() * (all.length - i))
    ;[all[i], all[j]] = [all[j]!, all[i]!]
  }
  return all.slice(0, count).sort((a, b) => a - b)
}

export default function ConfirmMnemonic() {
  const navigate = useNavigate()
  const draft = useMnemonicDraft((s) => s.mnemonic)
  // Hooks must run unconditionally; bail after via Navigate.
  const words = useMemo(() => (draft ? draft.split(" ") : []), [draft])
  const indices = useMemo(() => (words.length === 12 ? pickIndices(12, 3) : []), [words.length])
  const [answers, setAnswers] = useState<Record<number, string>>({})

  if (!draft) return <Navigate to="/auth/create" replace />

  const allCorrect = indices.every((i) => (answers[i] ?? "").trim().toLowerCase() === words[i])

  return (
    <YStack flex={1} p="$5" gap="$5" maxWidth={520} mx="auto">
      <Text fontSize="$8" fontWeight="700">
        Confirm recovery phrase
      </Text>
      <Text col="$neutral2">
        Enter the requested words from the phrase you just backed up.
      </Text>

      <Card p="$4">
        <Stack gap="$3">
          {indices.map((i) => (
            <XStack key={i} ai="center" gap="$3">
              <Text width={48} col="$neutral2">
                Word {i + 1}
              </Text>
              <Input
                flex={1}
                autoCapitalize="none"
                autoCorrect={false}
                value={answers[i] ?? ""}
                onChangeText={(v: string) => setAnswers({ ...answers, [i]: v })}
                placeholder="enter word"
              />
            </XStack>
          ))}
        </Stack>
      </Card>

      <Button disabled={!allCorrect} onPress={() => navigate("/auth/pin")} theme="active">
        Continue
      </Button>
    </YStack>
  )
}
