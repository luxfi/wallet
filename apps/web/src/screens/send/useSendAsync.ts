/**
 * Per-chain broadcast dispatch. Returns the on-chain tx hash on success.
 *
 * Hook returns a stable async function so `useSend` can call it inside its
 * state-machine submit step. Signing is self-custodial: the unlocked mnemonic
 * from the auth slice is the signer. Chain-library calls stay isolated to
 * `lib/chain-*.ts`; this hook only picks the path by chain kind.
 */
import { useCallback } from "react"
import { CHAINS, type Asset } from "../../lib/asset"
import { useAuth } from "../../store/auth"
import { sendEvmNative } from "../../lib/chain-evm"
import { sendLuxNative } from "../../lib/chain-lux"
import { sendSolana } from "../../lib/chain-solana"

export interface SendArgs {
  asset: Asset
  to: string
  /** Amount in smallest units. */
  value: bigint
}

export function useSendAsync() {
  const mnemonic = useAuth((s) => s.mnemonic)

  return useCallback(
    async ({ asset, to, value }: SendArgs): Promise<string> => {
      const chain = CHAINS[asset.chainId]
      if (!chain) throw new Error(`Unknown chain: ${asset.chainId}`)

      switch (chain.kind) {
        case "evm": {
          if (!mnemonic) throw new Error("Wallet locked")
          if (chain.evmChainId === undefined) {
            throw new Error(`Chain ${chain.id} has no EVM id`)
          }
          return sendEvmNative({
            mnemonic,
            evmChainId: chain.evmChainId,
            to,
            value,
            contract: asset.contract,
          })
        }

        case "lux-pchain":
        case "lux-xchain":
          return sendLuxNative({ chainId: chain.id, to, value })

        case "solana":
          return sendSolana({ to, value })
      }
    },
    [mnemonic],
  )
}
