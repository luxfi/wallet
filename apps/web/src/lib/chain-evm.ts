/**
 * EVM native + ERC-20 send.
 *
 * The signer is the in-app account: a viem HD account derived from the
 * unlocked BIP-39 mnemonic at m/44'/60'/0'/0/0 — the same path `lib/derive.ts`
 * and the Receive screen use, so the send-from address equals the address the
 * wallet shows. No injected wallet, no connector, no backend.
 *
 * The wallet client is built per call from that account and the chain's
 * bootnode RPC. viem prepares nonce, gas, and fees against the RPC, signs
 * locally, and broadcasts via eth_sendRawTransaction. This is the EVM sibling
 * of `chain-lux.ts` / `chain-solana.ts`; `useSendAsync` routes every EVM chain
 * kind here.
 */
import { createWalletClient, http, type Hex } from "viem"
import { mnemonicToAccount, type HDAccount } from "viem/accounts"
import { viemChain } from "./chains"

/** BIP-44 account path for every EVM chain. */
export const EVM_PATH = "m/44'/60'/0'/0/0"

/** The in-app EVM signer for a mnemonic. The one place callers derive it. */
export function evmAccount(mnemonic: string): HDAccount {
  return mnemonicToAccount(mnemonic, { path: EVM_PATH })
}

export interface SendEvmArgs {
  mnemonic: string
  evmChainId: number
  to: string
  /** Amount in smallest units. */
  value: bigint
  /** ERC-20 contract for a token send; omit for the chain-native asset. */
  contract?: `0x${string}`
}

export async function sendEvmNative({
  mnemonic,
  evmChainId,
  to,
  value,
  contract,
}: SendEvmArgs): Promise<string> {
  const chain = viemChain(evmChainId)
  if (!chain) throw new Error(`No RPC configured for chain ${evmChainId}`)

  const account = evmAccount(mnemonic)
  const client = createWalletClient({
    account,
    chain,
    transport: http(chain.rpcUrls.default.http[0]),
  })

  if (contract) {
    // ERC-20 transfer(to,value): 0xa9059cbb || 32B addr || 32B value.
    const addr = to.toLowerCase().replace(/^0x/, "").padStart(64, "0")
    const val = value.toString(16).padStart(64, "0")
    return client.sendTransaction({ to: contract, data: `0xa9059cbb${addr}${val}` as Hex })
  }
  return client.sendTransaction({ to: to as `0x${string}`, value })
}
