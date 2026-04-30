/**
 * Lux P/X-Chain native send.
 *
 * Lux P/X are not EVM chains; they speak Avalanche-style PVM/AVM TXs
 * over the platform JSON-RPC. We use the `@l.x/api` thin client owned by
 * the Lux SDK team. The build will fail until that dependency lands in
 * apps/web/package.json — which is the correct outcome (no fakes).
 *
 * The mnemonic for signing is read from the auth slice at call-time so
 * we never thread the secret through props/store/network.
 */
import { LuxClient } from "@l.x/api"
import { useAuth } from "../store/auth"

export interface SendLuxArgs {
  chainId: string
  to: string
  value: bigint
}

export async function sendLuxNative({
  chainId,
  to,
  value,
}: SendLuxArgs): Promise<string> {
  const mnemonic = useAuth.getState().mnemonic
  if (!mnemonic) throw new Error("Wallet locked")

  const client = LuxClient.fromMnemonic(mnemonic)
  const tx = await client.buildTransfer({
    chain: chainId === "lux-p" ? "P" : "X",
    to,
    amount: value.toString(),
  })
  const signed = await client.sign(tx)
  return await client.broadcast(signed)
}
