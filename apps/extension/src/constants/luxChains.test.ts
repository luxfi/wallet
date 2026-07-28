import { AVALANCHE_MAINNET, LUX_CHAINS } from 'src/constants/luxChains'

// These eight entries are the wallet's own networks, and they ship inside the
// browser extension — a wrong host or prefix here is not a failed request, it
// is a chain the user cannot transact on until the extension is republished.
//
// luxd serves exactly one prefix, /v1 (node/server/http/server.go), and the
// `bc/` segment is required: /v1/C/rpc 404s just like the retired /ext form.
const CANONICAL = /^https:\/\/api\.[a-z-]+\.network\/v1\/bc\/C\/rpc$/

describe('LUX_CHAINS rpc urls', () => {
  it.each(LUX_CHAINS.map((c) => [c.chainName, c] as const))(
    '%s uses the canonical /v1/bc/C/rpc form on its own sovereign host',
    (_name, chain) => {
      expect(chain.rpcUrls).toHaveLength(1)
      expect(chain.rpcUrls[0]).toMatch(CANONICAL)
    }
  )

  it('covers every sovereign network exactly once', () => {
    // Guards the it.each above from silently passing on an empty list.
    expect(LUX_CHAINS.map((c) => c.chainId).sort((a, b) => a - b)).toEqual([
      36911, 36912, 36962, 36963, 96368, 96369, 200200, 200201,
    ])
  })

  // chainIdHex is what the extension hands the dapp in wallet_switchEthereumChain
  // and what it compares against eth_chainId. Zoo shipped 0x30da8 (200104) for
  // chain 200200 and 0x30da9 for 200201 — a wallet that cannot agree with its
  // own node about which chain it is on. Derive, never transcribe.
  it.each(LUX_CHAINS.map((c) => [c.chainName, c] as const))(
    '%s chainIdHex agrees with chainId',
    (_name, chain) => {
      expect(chain.chainIdHex).toBe(`0x${chain.chainId.toString(16)}`)
    }
  )

  it('never routes a Lux-family chain through another org gateway', () => {
    for (const chain of LUX_CHAINS) {
      expect(chain.rpcUrls[0]).not.toContain('api.hanzo.ai')
      expect(chain.rpcUrls[0]).not.toContain('/ext/')
      expect(chain.rpcUrls[0]).not.toMatch(/\/(mainnet|testnet|devnet)\//)
    }
  })

  // Avalanche's own API really does serve /ext — that is their prefix, not a
  // leftover of ours. Rewriting it would break the integration, so the rule
  // above must stay scoped to Lux-family hosts.
  it('leaves the Avalanche endpoint on its own /ext prefix', () => {
    expect(AVALANCHE_MAINNET.rpcUrls[0]).toBe('https://api.avax.network/ext/bc/C/rpc')
  })
})
