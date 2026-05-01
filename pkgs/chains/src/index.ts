/**
 * viem chain definitions for Lux Network and ecosystem L1s.
 *
 * Single source of truth for static viem `Chain` configs across the Lux
 * ecosystem (lux/build developer portal, lux/wallet apps, third-party
 * integrators). White-label deployments (Liquidity, etc.) overlay their
 * own chain configs via runtime `brand.json` and do not import this pkg.
 *
 * Chain IDs are pinned per `~/work/lux/build/CLAUDE.md` `NETWORKS.yaml`:
 *   Lux mainnet         96369   testnet 96368
 *   Lux DEX             96370
 *   Zoo                 200200  testnet 200201
 *   Hanzo               36963   testnet 36964
 *   Sparkle Pony (SPC)  36911   testnet 36910
 *   Pars                494949  testnet 7071
 *
 * RPC + explorer URLs use the public canonical hostnames. White-label
 * gateways override at runtime via the wallet brand-config layer.
 */
import { defineChain } from "viem"

export const lux = defineChain({
  id: 96369,
  name: "Lux",
  nativeCurrency: { decimals: 18, name: "Lux", symbol: "LUX" },
  rpcUrls: {
    default: { http: ["https://api.lux.network/ext/bc/C/rpc"] },
  },
  blockExplorers: {
    default: { name: "Lux Explorer", url: "https://explore.lux.network" },
  },
  contracts: {},
})

export const luxTestnet = defineChain({
  id: 96368,
  name: "Lux Testnet",
  nativeCurrency: { decimals: 18, name: "Lux", symbol: "LUX" },
  rpcUrls: {
    default: { http: ["https://api.lux-test.network/ext/bc/C/rpc"] },
  },
  blockExplorers: {
    default: { name: "Lux Testnet Explorer", url: "https://explore.lux-test.network" },
  },
  testnet: true,
  contracts: {},
})

export const luxDex = defineChain({
  id: 96370,
  name: "Lux DEX",
  nativeCurrency: { decimals: 18, name: "Lux", symbol: "LUX" },
  rpcUrls: {
    default: { http: ["https://api.dex.lux.network/ext/bc/C/rpc"] },
  },
  blockExplorers: {
    default: { name: "DEX Explorer", url: "https://explorer.dex.lux.network" },
  },
  contracts: {},
})

export const zoo = defineChain({
  id: 200200,
  name: "Zoo",
  nativeCurrency: { decimals: 18, name: "Zoo", symbol: "ZOO" },
  rpcUrls: {
    default: { http: ["https://rpc.zoo.ngo"] },
  },
  blockExplorers: {
    default: { name: "Zoo Explorer", url: "https://explore.zoo.ngo" },
  },
  contracts: {},
})

export const zooTestnet = defineChain({
  id: 200201,
  name: "Zoo Testnet",
  nativeCurrency: { decimals: 18, name: "Zoo", symbol: "ZOO" },
  rpcUrls: {
    default: { http: ["https://testnet.rpc.zoo.ngo"] },
  },
  blockExplorers: {
    default: { name: "Zoo Testnet Explorer", url: "https://testnet.explore.zoo.ngo" },
  },
  testnet: true,
  contracts: {},
})

export const hanzo = defineChain({
  id: 36963,
  name: "Hanzo",
  nativeCurrency: { decimals: 18, name: "Hanzo AI", symbol: "AI" },
  rpcUrls: {
    default: { http: ["https://rpc.hanzo.ai"] },
  },
  blockExplorers: {
    default: { name: "Hanzo Explorer", url: "https://explore.hanzo.ai" },
  },
  contracts: {},
})

export const hanzoTestnet = defineChain({
  id: 36964,
  name: "Hanzo Testnet",
  nativeCurrency: { decimals: 18, name: "Hanzo AI", symbol: "AI" },
  rpcUrls: {
    default: { http: ["https://testnet.rpc.hanzo.ai"] },
  },
  blockExplorers: {
    default: { name: "Hanzo Testnet Explorer", url: "https://testnet.explore.hanzo.ai" },
  },
  testnet: true,
  contracts: {},
})

export const sparklePony = defineChain({
  id: 36911,
  name: "Sparkle Pony",
  nativeCurrency: { decimals: 18, name: "Sparkle Pony", symbol: "SPC" },
  rpcUrls: {
    default: { http: ["https://rpc.sparklepony.xyz"] },
  },
  blockExplorers: {
    default: { name: "Sparkle Pony Explorer", url: "https://explore.sparklepony.xyz" },
  },
  contracts: {},
})

export const sparklePonyTestnet = defineChain({
  id: 36910,
  name: "Sparkle Pony Testnet",
  nativeCurrency: { decimals: 18, name: "Sparkle Pony", symbol: "SPC" },
  rpcUrls: {
    default: { http: ["https://testnet.rpc.sparklepony.xyz"] },
  },
  blockExplorers: {
    default: { name: "Sparkle Pony Testnet Explorer", url: "https://testnet.explore.sparklepony.xyz" },
  },
  testnet: true,
  contracts: {},
})

export const pars = defineChain({
  id: 494949,
  name: "Pars",
  nativeCurrency: { decimals: 18, name: "Pars", symbol: "PARS" },
  rpcUrls: {
    default: { http: ["https://rpc.pars.network"] },
  },
  blockExplorers: {
    default: { name: "Pars Explorer", url: "https://explore.pars.network" },
  },
  contracts: {},
})

export const parsTestnet = defineChain({
  id: 7071,
  name: "Pars Testnet",
  nativeCurrency: { decimals: 18, name: "Pars", symbol: "PARS" },
  rpcUrls: {
    default: { http: ["https://testnet.rpc.pars.network"] },
  },
  blockExplorers: {
    default: { name: "Pars Testnet Explorer", url: "https://testnet.explore.pars.network" },
  },
  testnet: true,
  contracts: {},
})

/** Lux Network chains: mainnet, testnet, and DEX chain. */
export const LUX_CHAINS = [lux, luxTestnet, luxDex] as const

/** Zoo Network L1: mainnet + testnet. */
export const ZOO_CHAINS = [zoo, zooTestnet] as const

/** Hanzo Network L1: mainnet + testnet. */
export const HANZO_CHAINS = [hanzo, hanzoTestnet] as const

/** Sparkle Pony L1: mainnet + testnet. */
export const SPC_CHAINS = [sparklePony, sparklePonyTestnet] as const

/** Pars Network L1: mainnet + testnet. */
export const PARS_CHAINS = [pars, parsTestnet] as const

/** All Lux-ecosystem chains shipped by this package. */
export const ALL_CHAINS = [
  ...LUX_CHAINS,
  ...ZOO_CHAINS,
  ...HANZO_CHAINS,
  ...SPC_CHAINS,
  ...PARS_CHAINS,
] as const
