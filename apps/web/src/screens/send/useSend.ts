/**
 * useSend — orchestrates sign + broadcast across chain kinds.
 *
 *   EVM    → viem walletClient.sendTransaction (via wagmi)
 *   Lux    → @l.x/api thin client
 *   Solana → @solana/web3.js + adapter
 *
 * The hook is a state machine driven by `useSendStore`. The screens never
 * touch chain libraries directly; everything routes through `submit()`.
 *
 * Failure modes are explicit: any thrown error transitions the store into
 * `error` with `error` populated, never into `done`.
 */
import { useCallback } from "react"
import { useSendAsync } from "./useSendAsync"
import { useSendStore } from "../../store/send"
import { CHAINS, parseUnits } from "../../lib/asset"

export interface UseSend {
  preview: () => void
  confirm: () => void
  submit: () => Promise<void>
  cancel: () => void
}

export function useSend(): UseSend {
  const sendAsync = useSendAsync()

  const preview = useCallback(() => {
    useSendStore.setState({ error: null, status: "preview" })
  }, [])

  const confirm = useCallback(() => {
    useSendStore.setState({ error: null, status: "confirming" })
  }, [])

  const cancel = useCallback(() => {
    useSendStore.setState({ status: "idle", error: null })
  }, [])

  const submit = useCallback(async () => {
    const { asset, to, amount } = useSendStore.getState()
    if (!asset) {
      useSendStore.setState({ error: "No asset selected", status: "error" })
      return
    }
    const chain = CHAINS[asset.chainId]
    if (!chain) {
      useSendStore.setState({
        error: `Unknown chain: ${asset.chainId}`,
        status: "error",
      })
      return
    }

    let value: bigint
    try {
      value = parseUnits(amount, asset.decimals)
    } catch (e) {
      useSendStore.setState({
        error: `Invalid amount: ${(e as Error).message}`,
        status: "error",
      })
      return
    }
    if (value <= 0n) {
      useSendStore.setState({
        error: "Amount must be greater than zero",
        status: "error",
      })
      return
    }

    useSendStore.setState({ status: "broadcasting" })
    try {
      const hash = await sendAsync({ asset, to, value })
      useSendStore.setState({ txHash: hash, status: "done" })
    } catch (e) {
      useSendStore.setState({
        error: (e as Error).message ?? "Broadcast failed",
        status: "error",
      })
    }
  }, [sendAsync])

  return { preview, confirm, submit, cancel }
}
