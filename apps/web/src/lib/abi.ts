/**
 * ABI decoder — local table for the calls we care about, with optional
 * 4byte directory fallback (gated behind an explicit user click).
 *
 * Local table covers the canonical signatures that appear in 99% of
 * wallet flows: ERC-20 approve/transfer/transferFrom, swap routing
 * functions, multicall, permit, etc. Everything else falls back to the
 * 4byte directory IF the user opts in.
 *
 * Why opt-in for the network call: the calldata is the user's intent,
 * but the function selector ("0x12345678") is also a fingerprint of the
 * contract being called. Sending it to a third-party directory before
 * the user has explicitly asked is a privacy regression.
 *
 * No `fetch` happens at module load; selectors only resolve when
 * `decodeCalldata` is invoked. Use `decodeLocal` for synchronous local-only
 * decode (returns null when the selector isn't in the table).
 */

export interface DecodedArg {
  name: string
  type: string
  /** String representation — addresses are lower-cased, uints decimal. */
  value: string
}

export interface DecodedCall {
  /** Bare function name. */
  name: string
  /** Canonical signature, e.g. `transfer(address,uint256)`. */
  signature: string
  /** Decoded arguments in declaration order. */
  args: DecodedArg[]
  /**
   * `true` if resolved from the local table, `false` if 4byte, `null`
   * if the selector was unknown and we returned a placeholder. Drives
   * the "via 4byte directory" / "unknown" badge in TxSummary.
   */
  local: boolean | null
}

/**
 * Local signature table. Each entry maps a 4-byte selector (lower-case
 * hex, no `0x`) to the decoded shape. Args' `value` is filled in by
 * the decoder.
 */
const LOCAL_TABLE: Record<
  string,
  { name: string; signature: string; argTypes: { name: string; type: string }[] }
> = {
  // ERC-20
  "095ea7b3": {
    name: "approve",
    signature: "approve(address,uint256)",
    argTypes: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
    ],
  },
  a9059cbb: {
    name: "transfer",
    signature: "transfer(address,uint256)",
    argTypes: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
  },
  "23b872dd": {
    name: "transferFrom",
    signature: "transferFrom(address,address,uint256)",
    argTypes: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
    ],
  },
  // Uniswap-V2 router
  "38ed1739": {
    name: "swapExactTokensForTokens",
    signature:
      "swapExactTokensForTokens(uint256,uint256,address[],address,uint256)",
    argTypes: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
  },
  "7ff36ab5": {
    name: "swapExactETHForTokens",
    signature: "swapExactETHForTokens(uint256,address[],address,uint256)",
    argTypes: [
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
  },
  "18cbafe5": {
    name: "swapExactTokensForETH",
    signature: "swapExactTokensForETH(uint256,uint256,address[],address,uint256)",
    argTypes: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
  },
  // Permit2
  "2b67b570": {
    name: "permit",
    signature:
      "permit(address,((address,uint160,uint48,uint48),address,uint256),bytes)",
    argTypes: [
      { name: "owner", type: "address" },
      { name: "permitSingle", type: "tuple" },
      { name: "signature", type: "bytes" },
    ],
  },
  // Multicall
  ac9650d8: {
    name: "multicall",
    signature: "multicall(bytes[])",
    argTypes: [{ name: "data", type: "bytes[]" }],
  },
}

/** Strip 0x prefix and lower-case the rest. */
function strip0x(s: string): string {
  return (s.startsWith("0x") || s.startsWith("0X") ? s.slice(2) : s).toLowerCase()
}

/**
 * Decode a single ABI parameter chunk (32 bytes hex). Only handles the
 * static types we care about + the bytes/array length headers. Dynamic
 * types fall through to a hex passthrough — good enough for display.
 */
function decodeParam(type: string, hex: string): string {
  const word = hex.slice(0, 64)
  if (type === "address") {
    // last 20 bytes of the word.
    return "0x" + word.slice(24)
  }
  if (type.startsWith("uint") || type.startsWith("int")) {
    if (!word) return "0"
    return BigInt("0x" + word).toString()
  }
  if (type === "bool") {
    return BigInt("0x" + word) === 0n ? "false" : "true"
  }
  if (type === "address[]" || type.endsWith("[]") || type === "bytes" || type === "tuple") {
    // Display the offset pointer as-is; full dynamic decode is out of
    // scope for the modal — TxSummary shows the function name + sig
    // and the user can inspect on a block explorer.
    return "0x" + word
  }
  return "0x" + word
}

/**
 * Synchronous local decode. Returns null if the selector is not in
 * the table. Call sites display the raw selector + offer the
 * "Look up signature" button to invoke `decodeCalldata({network:true})`.
 */
export function decodeLocal(data: string): DecodedCall | null {
  const stripped = strip0x(data)
  if (stripped.length < 8) return null
  const selector = stripped.slice(0, 8)
  const entry = LOCAL_TABLE[selector]
  if (!entry) return null
  const body = stripped.slice(8)
  const args: DecodedArg[] = entry.argTypes.map((a, i) => {
    const word = body.slice(i * 64, (i + 1) * 64)
    return { name: a.name, type: a.type, value: decodeParam(a.type, word) }
  })
  return { name: entry.name, signature: entry.signature, args, local: true }
}

/**
 * Async decode. Tries the local table first; on miss and `network:true`,
 * queries the 4byte directory. We fetch ONLY the selector's known text
 * signature (no calldata), so the privacy footprint is minimal.
 *
 * 4byte returns multiple matches sometimes (selector collisions). We
 * pick the one with the lowest id (the earliest registered) since that
 * tends to be the canonical signature.
 */
export async function decodeCalldata(
  data: string,
  opts: { network?: boolean } = {},
): Promise<DecodedCall | null> {
  const local = decodeLocal(data)
  if (local) return local

  if (!opts.network) return null

  const stripped = strip0x(data)
  if (stripped.length < 8) return null
  const selector = stripped.slice(0, 8)

  try {
    const url = `https://www.4byte.directory/api/v1/signatures/?hex_signature=0x${selector}`
    const res = await fetch(url, { headers: { accept: "application/json" } })
    if (!res.ok) return unknownPlaceholder(selector)
    const json = (await res.json()) as {
      results: { id: number; text_signature: string }[]
    }
    if (!json.results?.length) return unknownPlaceholder(selector)
    const match = json.results.reduce((a, b) => (a.id < b.id ? a : b))
    return parseSignature(selector, match.text_signature, stripped.slice(8))
  } catch {
    return unknownPlaceholder(selector)
  }
}

function unknownPlaceholder(selector: string): DecodedCall {
  return {
    name: `unknown_${selector}`,
    signature: `0x${selector}`,
    args: [],
    local: null,
  }
}

/** Parse `name(type1,type2,...)` and decode each chunk best-effort. */
function parseSignature(
  selector: string,
  sig: string,
  body: string,
): DecodedCall {
  const m = sig.match(/^([a-zA-Z_$][\w$]*)\(([^)]*)\)$/)
  if (!m) return unknownPlaceholder(selector)
  const name = m[1]!
  const types = m[2]!
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
  const args: DecodedArg[] = types.map((type, i) => {
    const word = body.slice(i * 64, (i + 1) * 64)
    return { name: `arg${i}`, type, value: decodeParam(type, word) }
  })
  return { name, signature: sig, args, local: false }
}
