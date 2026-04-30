/**
 * Solana native send.
 *
 * Derives the SLIP-10 ed25519 keypair from the unlocked mnemonic, then
 * signs and submits a SystemProgram.transfer to the configured RPC.
 *
 * The keypair lives only on the call stack — not stored, not memoised.
 * Foundation Blue can swap RPC URLs via brand.json without touching this.
 */
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  Keypair,
  sendAndConfirmTransaction,
} from "@solana/web3.js"
import { hmac } from "@noble/hashes/hmac"
import { sha512 } from "@noble/hashes/sha512"
import { mnemonicToSeedSync } from "@scure/bip39"
import { useAuth } from "../store/auth"

export interface SendSolanaArgs {
  to: string
  value: bigint
  rpcUrl?: string
}

function slip10Ed25519(seed: Uint8Array, path: number[]): Uint8Array {
  let I = hmac(sha512, new TextEncoder().encode("ed25519 seed"), seed)
  let key = I.slice(0, 32)
  let chainCode = I.slice(32)
  for (const i of path) {
    const idx = i | 0x80000000
    const data = new Uint8Array(1 + 32 + 4)
    data[0] = 0x00
    data.set(key, 1)
    data[33] = (idx >>> 24) & 0xff
    data[34] = (idx >>> 16) & 0xff
    data[35] = (idx >>> 8) & 0xff
    data[36] = idx & 0xff
    I = hmac(sha512, chainCode, data)
    key = I.slice(0, 32)
    chainCode = I.slice(32)
  }
  return key
}

export async function sendSolana({
  to,
  value,
  rpcUrl = "https://api.mainnet-beta.solana.com",
}: SendSolanaArgs): Promise<string> {
  const mnemonic = useAuth.getState().mnemonic
  if (!mnemonic) throw new Error("Wallet locked")

  const seed = mnemonicToSeedSync(mnemonic.normalize("NFKD").trim())
  const priv = slip10Ed25519(seed, [44, 501, 0, 0])
  const fromKp = Keypair.fromSeed(priv)

  const conn = new Connection(rpcUrl, "confirmed")
  const tx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: fromKp.publicKey,
      toPubkey: new PublicKey(to),
      lamports: Number(value),
    }),
  )
  return await sendAndConfirmTransaction(conn, tx, [fromKp])
}
