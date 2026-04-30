/**
 * Per-chain broadcast dispatch. Returns the on-chain tx hash on success.
 *
 * Hook returns a stable async function so `useSend` can call it inside
 * its state-machine submit step. Chain-library imports stay isolated to
 * `lib/chain-*.ts`; this hook glues wagmi + Foundation's chain helpers.
 */
import { useCallback } from "react"
import { useWalletClient } from "wagmi"
import { CHAINS, type Asset } from "../../lib/asset"
import { sendLuxNative } from "../../lib/chain-lux"
import { sendSolana } from "../../lib/chain-solana"

export interface SendArgs {
  asset: Asset
  to: string
  /** Amount in smallest units. */
  value: bigint
}

export function useSendAsync() {
  const { data: walletClient } = useWalletClient()

  return useCallback(
    async ({ asset, to, value }: SendArgs): Promise<string> => {
      const chain = CHAINS[asset.chainId]
      if (!chain) throw new Error(`Unknown chain: ${asset.chainId}`)

      switch (chain.kind) {
        case "evm": {
          if (!walletClient) throw new Error("Wallet not connected")
          if (asset.contract) {
            // ERC-20 transfer(to,value): selector 0xa9059cbb || 32B addr || 32B value.
            const addrPadded = to
              .toLowerCase()
              .replace(/^0x/, "")
              .padStart(64, "0")
            const valHex = value.toString(16).padStart(64, "0")
            const data = `0xa9059cbb${addrPadded}${valHex}` as `0x${string}`
            return await walletClient.sendTransaction({
              to: asset.contract,
              data,
              chainId: chain.evmChainId,
            })
          }
          return await walletClient.sendTransaction({
            to: to as `0x${string}`,
            value,
            chainId: chain.evmChainId,
          })
        }

        case "lux-pchain":
        case "lux-xchain":
          return await sendLuxNative({ chainId: chain.id, to, value })

        case "solana":
          return await sendSolana({ to, value })
      }
    },
    [walletClient],
  )
}
