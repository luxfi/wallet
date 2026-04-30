/**
 * Type-only assertions for useWalletConnect's URI validator and namespace
 * intersection logic. The full project does not run a unit-test runner in
 * the web app yet; once Foundation lands a vitest harness, convert these
 * `console.assert` blocks into proper specs.
 */

import { __testing__ } from "./useWalletConnect"

const { isWcUri, intersectNamespaces, ALLOWED_METHODS } = __testing__

// --- URI validation ----------------------------------------------------

const goodUri =
  "wc:" +
  "0123456789abcdef0123456789abcdef" +
  "@2?relay-protocol=irn&symKey=" +
  "deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef"

const cases: Array<[string, boolean]> = [
  [goodUri, true],
  ["", false],
  ["http://evil.example", false],
  ["wc:short@2", false],
  ["wc:" + "x".repeat(40) + "@2?", false],
  ["wc:" + "0".repeat(40) + "@1?relay-protocol=irn", false],
  ["wc:" + "0".repeat(40) + "@2?<script>", false],
  ["wc:" + "0".repeat(5000) + "@2?relay-protocol=irn", false],
]

for (const [uri, expected] of cases) {
  const got = isWcUri(uri)
  if (got !== expected) {
    throw new Error(`isWcUri(${uri.slice(0, 32)}…) expected ${expected}, got ${got}`)
  }
}

// --- Namespace intersection -------------------------------------------

const merged = intersectNamespaces(
  {
    eip155: {
      chains: ["eip155:96369", "eip155:1"],
      methods: ["eth_sendTransaction", "eth_unsupportedDangerousMethod"],
      events: ["chainChanged"],
    },
  },
  undefined,
  [96369, 1, 8453],
  "0xA1B2C3D4E5F60718293A4B5C6D7E8F0011223344",
)

if (!merged.eip155) throw new Error("missing eip155 namespace")
if (!merged.eip155.chains.includes("eip155:96369")) {
  throw new Error("wallet-supported chain dropped")
}
if (merged.eip155.methods.includes("eth_unsupportedDangerousMethod")) {
  throw new Error("dangerous method must be filtered out")
}
if (!ALLOWED_METHODS.has("eth_sendTransaction")) {
  throw new Error("send tx not allowed")
}

// Required namespace with zero supported chains must throw.
let threw = false
try {
  intersectNamespaces(
    {
      eip155: {
        chains: ["eip155:9999999"],
        methods: ["eth_sendTransaction"],
        events: [],
      },
    },
    undefined,
    [96369],
    "0x0000000000000000000000000000000000000000",
  )
} catch {
  threw = true
}
if (!threw) throw new Error("must reject required ns with no supported chains")

// Mark file as a module so isolated-modules / Vite is happy.
export {}
