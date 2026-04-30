/**
 * Lux P/X-Chain native send — STUB.
 *
 * The real implementation depends on `@l.x/api` (the Lux SDK thin client)
 * which ships from a workspace whose npm publish has unresolved
 * `./__generated__/*` files. Until that upstream is fixed, this module
 * exposes the same surface but throws on use.
 *
 * EVM C-Chain sends (chainId 96369 / 96368) work today via the wagmi
 * adapter — that's the canonical path for end-user balances.
 */

export interface SendLuxArgs {
  chainId: string
  to: string
  value: bigint
}

export async function sendLuxNative(_args: SendLuxArgs): Promise<string> {
  throw new Error(
    "Lux P/X-Chain native send is not yet wired in this build. Use the EVM " +
      "C-Chain (chainId 96369 / 96368) for now. The native PVM/AVM client " +
      "lands via @l.x/api once its npm publish ships generated GraphQL " +
      "files (currently broken upstream).",
  )
}
