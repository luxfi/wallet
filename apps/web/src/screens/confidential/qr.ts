/**
 * Minimal QR-code SVG renderer.
 *
 * Pure TypeScript implementation supporting QR versions 1..40, mode 4 (8-bit
 * byte) only, error-correction level L. Sufficient for verifier-link payloads
 * which are short ASCII URLs.
 *
 * Reference: ISO/IEC 18004:2015. Implementation hand-rolled to avoid pulling
 * a runtime dep into the wallet's bundle. ~12kb minified.
 *
 * If a payload exceeds the largest supported version's capacity (~2953 bytes
 * for ECC level L), the renderer returns an SVG containing a textual fallback
 * (and the caller can swap in a heavier library at that point).
 */

// ---------- Galois field GF(256) for Reed-Solomon ----------

const GF_EXP = new Uint8Array(256)
const GF_LOG = new Uint8Array(256)
;(function init() {
  let x = 1
  for (let i = 0; i < 255; i++) {
    GF_EXP[i] = x
    GF_LOG[x] = i
    x <<= 1
    if (x & 0x100) x ^= 0x11d
  }
  GF_EXP[255] = GF_EXP[0]
})()

function gfMul(a: number, b: number): number {
  if (a === 0 || b === 0) return 0
  return GF_EXP[(GF_LOG[a] + GF_LOG[b]) % 255]
}

function rsGeneratorPoly(degree: number): number[] {
  let poly = [1]
  for (let i = 0; i < degree; i++) {
    const next = new Array<number>(poly.length + 1).fill(0)
    for (let j = 0; j < poly.length; j++) {
      next[j] ^= poly[j]
      next[j + 1] ^= gfMul(poly[j], GF_EXP[i])
    }
    poly = next
  }
  return poly
}

function rsEncode(data: Uint8Array, ecLen: number): Uint8Array {
  const gen = rsGeneratorPoly(ecLen)
  const buf = new Uint8Array(data.length + ecLen)
  buf.set(data)
  for (let i = 0; i < data.length; i++) {
    const factor = buf[i]
    if (factor === 0) continue
    for (let j = 0; j < gen.length; j++) {
      buf[i + j] ^= gfMul(gen[j], factor)
    }
  }
  return buf.slice(data.length)
}

// ---------- QR version capacity tables (ECC level L only) ----------
// Source: ISO/IEC 18004 table 7. (capacity in bytes for byte mode, ECL L)
const CAPACITY_L: number[] = [
  17, 32, 53, 78, 106, 134, 154, 192, 230, 271, // 1..10
  321, 367, 425, 458, 520, 586, 644, 718, 792, 858, // 11..20
  929, 1003, 1091, 1171, 1273, 1367, 1465, 1528, 1628, 1732, // 21..30
  1840, 1952, 2068, 2188, 2303, 2431, 2563, 2699, 2809, 2953, // 31..40
]

// Number of error correction codewords per block (ECL L)
const EC_CODEWORDS_L: number[] = [
  7, 10, 15, 20, 26, 18, 20, 24, 30, 18,
  20, 24, 26, 30, 22, 24, 28, 30, 28, 28,
  28, 28, 30, 30, 26, 28, 28, 28, 28, 28,
  28, 28, 28, 28, 28, 28, 28, 28, 28, 28,
]

// Block group descriptor: [g1, dataPerBlockG1, g2, dataPerBlockG2] for ECL L
// From ISO/IEC 18004 Annex C.
const BLOCKS_L: number[][] = [
  [1, 19, 0, 0], [1, 34, 0, 0], [1, 55, 0, 0], [1, 80, 0, 0], [1, 108, 0, 0],
  [2, 68, 0, 0], [2, 78, 0, 0], [2, 97, 0, 0], [2, 116, 0, 0], [2, 68, 2, 69],
  [4, 81, 0, 0], [2, 92, 2, 93], [4, 107, 0, 0], [3, 115, 1, 116], [5, 87, 1, 88],
  [5, 98, 1, 99], [1, 107, 5, 108], [5, 120, 1, 121], [3, 113, 4, 114], [3, 107, 5, 108],
  [4, 116, 4, 117], [2, 111, 7, 112], [4, 121, 5, 122], [6, 117, 4, 118], [8, 106, 4, 107],
  [10, 114, 2, 115], [8, 122, 4, 123], [3, 117, 10, 118], [7, 116, 7, 117], [5, 115, 10, 116],
  [13, 115, 3, 116], [17, 115, 0, 0], [17, 115, 1, 116], [13, 115, 6, 116], [12, 121, 7, 122],
  [6, 121, 14, 122], [17, 122, 4, 123], [4, 122, 18, 123], [20, 117, 4, 118], [19, 118, 6, 119],
]

// Alignment pattern centres per version (1..40). Version 1 has none.
const ALIGNMENT_CENTRES: number[][] = [
  [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34],
  [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50], [6, 30, 54],
  [6, 32, 58], [6, 34, 62], [6, 26, 46, 66], [6, 26, 48, 70], [6, 26, 50, 74],
  [6, 30, 54, 78], [6, 30, 56, 82], [6, 30, 58, 86], [6, 34, 62, 90],
  [6, 28, 50, 72, 94], [6, 26, 50, 74, 98], [6, 30, 54, 78, 102], [6, 28, 54, 80, 106],
  [6, 32, 58, 84, 110], [6, 30, 58, 86, 114], [6, 34, 62, 90, 118],
  [6, 26, 50, 74, 98, 122], [6, 30, 54, 78, 102, 126], [6, 26, 52, 78, 104, 130],
  [6, 30, 56, 82, 108, 134], [6, 34, 60, 86, 112, 138], [6, 30, 58, 86, 114, 142],
  [6, 34, 62, 90, 118, 146], [6, 30, 54, 78, 102, 126, 150],
  [6, 24, 50, 76, 102, 128, 154], [6, 28, 54, 80, 106, 132, 158],
  [6, 32, 58, 84, 110, 136, 162], [6, 26, 54, 82, 110, 138, 166],
  [6, 30, 58, 86, 114, 142, 170],
]

// Format info bits for ECL L per mask 0..7 (ISO/IEC 18004 Annex C, table C.1)
const FORMAT_L: number[] = [
  0x77c4, 0x72f3, 0x7daa, 0x789d, 0x662f, 0x6318, 0x6c41, 0x6976,
]

// Version info (>= version 7) — 18 bits encoded. Table D.1.
const VERSION_INFO: { [v: number]: number } = {
  7: 0x07c94, 8: 0x085bc, 9: 0x09a99, 10: 0x0a4d3, 11: 0x0bbf6, 12: 0x0c762,
  13: 0x0d847, 14: 0x0e60d, 15: 0x0f928, 16: 0x10b78, 17: 0x1145d, 18: 0x12a17,
  19: 0x13532, 20: 0x149a6, 21: 0x15683, 22: 0x168c9, 23: 0x177ec, 24: 0x18ec4,
  25: 0x191e1, 26: 0x1afab, 27: 0x1b08e, 28: 0x1cc1a, 29: 0x1d33f, 30: 0x1ed75,
  31: 0x1f250, 32: 0x209d5, 33: 0x216f0, 34: 0x228ba, 35: 0x2379f, 36: 0x24b0b,
  37: 0x2542e, 38: 0x26a64, 39: 0x27541, 40: 0x28c69,
}

// ---------- Bit buffer ----------
class BitBuf {
  private bits: number[] = []
  push(value: number, len: number) {
    for (let i = len - 1; i >= 0; i--) {
      this.bits.push((value >>> i) & 1)
    }
  }
  length(): number { return this.bits.length }
  bytes(): Uint8Array {
    const out = new Uint8Array(Math.ceil(this.bits.length / 8))
    for (let i = 0; i < this.bits.length; i++) {
      out[Math.floor(i / 8)] |= this.bits[i] << (7 - (i % 8))
    }
    return out
  }
}

// ---------- Build the bit stream ----------
function pickVersion(byteLen: number): number {
  // Header overhead: 4 bits mode + length indicator. Length is 8 bits for v1-9,
  // 16 bits for v10-40. Round up to nearest byte for capacity comparison.
  for (let v = 1; v <= 40; v++) {
    const lenBits = v < 10 ? 8 : 16
    const totalBits = 4 + lenBits + 8 * byteLen + 4
    const capacityBits = CAPACITY_L[v - 1] * 8
    if (totalBits <= capacityBits) return v
  }
  return -1
}

function buildBitStream(data: Uint8Array, version: number): Uint8Array {
  const buf = new BitBuf()
  buf.push(0b0100, 4) // byte mode
  const lenBits = version < 10 ? 8 : 16
  buf.push(data.length, lenBits)
  for (const b of data) buf.push(b, 8)
  // Terminator (up to 4 zero bits, but cap at capacity).
  const cap = CAPACITY_L[version - 1] * 8
  const term = Math.min(4, cap - buf.length())
  if (term > 0) buf.push(0, term)
  // Pad to byte boundary.
  while (buf.length() % 8 !== 0) buf.push(0, 1)
  // Pad bytes 0xEC, 0x11 alternately to fill capacity.
  let padNext = 0xec
  while (buf.length() < cap) {
    buf.push(padNext, 8)
    padNext = padNext === 0xec ? 0x11 : 0xec
  }
  return buf.bytes()
}

// ---------- Build the data + EC interleaved codewords ----------
function buildCodewords(data: Uint8Array, version: number): Uint8Array {
  const ecLen = EC_CODEWORDS_L[version - 1]
  const [g1, k1, g2, k2] = BLOCKS_L[version - 1]
  const blocks: { data: Uint8Array; ec: Uint8Array }[] = []
  let off = 0
  for (let i = 0; i < g1; i++) {
    const d = data.slice(off, off + k1); off += k1
    blocks.push({ data: d, ec: rsEncode(d, ecLen) })
  }
  for (let i = 0; i < g2; i++) {
    const d = data.slice(off, off + k2); off += k2
    blocks.push({ data: d, ec: rsEncode(d, ecLen) })
  }
  // Interleave data, then EC.
  const maxData = Math.max(...blocks.map((b) => b.data.length))
  const out: number[] = []
  for (let i = 0; i < maxData; i++) {
    for (const b of blocks) if (i < b.data.length) out.push(b.data[i])
  }
  for (let i = 0; i < ecLen; i++) {
    for (const b of blocks) out.push(b.ec[i])
  }
  return new Uint8Array(out)
}

// ---------- Matrix construction ----------
type Matrix = number[][] // 0 / 1, -1 = unset
type Reserved = boolean[][]

function size(version: number): number { return version * 4 + 17 }

function newMatrix(n: number): { m: Matrix; r: Reserved } {
  const m: Matrix = []
  const r: Reserved = []
  for (let i = 0; i < n; i++) {
    m.push(new Array<number>(n).fill(0))
    r.push(new Array<boolean>(n).fill(false))
  }
  return { m, r }
}

function placeFinder(m: Matrix, r: Reserved, x: number, y: number) {
  for (let dy = -1; dy <= 7; dy++) {
    for (let dx = -1; dx <= 7; dx++) {
      const yy = y + dy, xx = x + dx
      if (yy < 0 || xx < 0 || yy >= m.length || xx >= m.length) continue
      const onBorder =
        (dx === 0 || dx === 6 || dy === 0 || dy === 6) &&
        dx >= 0 && dx <= 6 && dy >= 0 && dy <= 6
      const onCenter = dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4
      m[yy][xx] = onBorder || onCenter ? 1 : 0
      r[yy][xx] = true
    }
  }
}

function placeAlignment(m: Matrix, r: Reserved, cx: number, cy: number) {
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const yy = cy + dy, xx = cx + dx
      const onBorder = Math.abs(dx) === 2 || Math.abs(dy) === 2
      const onCenter = dx === 0 && dy === 0
      m[yy][xx] = onBorder || onCenter ? 1 : 0
      r[yy][xx] = true
    }
  }
}

function placeTimings(m: Matrix, r: Reserved) {
  const n = m.length
  for (let i = 8; i < n - 8; i++) {
    const v = i % 2 === 0 ? 1 : 0
    m[6][i] = v; r[6][i] = true
    m[i][6] = v; r[i][6] = true
  }
}

function reserveFormat(r: Reserved) {
  const n = r.length
  for (let i = 0; i < 9; i++) { r[8][i] = true; r[i][8] = true }
  for (let i = 0; i < 8; i++) { r[8][n - 1 - i] = true; r[n - 1 - i][8] = true }
  // Dark module
  r[n - 8][8] = true
}

function reserveVersion(r: Reserved, version: number) {
  if (version < 7) return
  const n = r.length
  for (let y = 0; y < 6; y++) {
    for (let x = 0; x < 3; x++) {
      r[y][n - 11 + x] = true
      r[n - 11 + x][y] = true
    }
  }
}

function placeData(m: Matrix, r: Reserved, codewords: Uint8Array) {
  const n = m.length
  let bitIdx = 0
  let upward = true
  for (let col = n - 1; col > 0; col -= 2) {
    if (col === 6) col-- // skip vertical timing column
    for (let i = 0; i < n; i++) {
      const y = upward ? n - 1 - i : i
      for (let dx = 0; dx < 2; dx++) {
        const x = col - dx
        if (r[y][x]) continue
        const byte = codewords[bitIdx >> 3] ?? 0
        const bit = (byte >> (7 - (bitIdx & 7))) & 1
        m[y][x] = bit
        bitIdx++
      }
    }
    upward = !upward
  }
}

function maskBit(mask: number, x: number, y: number): number {
  switch (mask) {
    case 0: return ((y + x) % 2) === 0 ? 1 : 0
    case 1: return (y % 2) === 0 ? 1 : 0
    case 2: return (x % 3) === 0 ? 1 : 0
    case 3: return ((y + x) % 3) === 0 ? 1 : 0
    case 4: return ((Math.floor(y / 2) + Math.floor(x / 3)) % 2) === 0 ? 1 : 0
    case 5: return ((y * x) % 2 + (y * x) % 3) === 0 ? 1 : 0
    case 6: return (((y * x) % 2 + (y * x) % 3) % 2) === 0 ? 1 : 0
    case 7: return (((y + x) % 2 + (y * x) % 3) % 2) === 0 ? 1 : 0
    default: return 0
  }
}

function applyMask(m: Matrix, r: Reserved, mask: number) {
  for (let y = 0; y < m.length; y++) {
    for (let x = 0; x < m.length; x++) {
      if (r[y][x]) continue
      m[y][x] ^= maskBit(mask, x, y)
    }
  }
}

function placeFormat(m: Matrix, mask: number) {
  const bits = FORMAT_L[mask]
  const n = m.length
  for (let i = 0; i < 15; i++) {
    const bit = (bits >> i) & 1
    // Top-left
    if (i < 6) m[8][i] = bit
    else if (i === 6) m[8][7] = bit
    else if (i === 7) m[8][8] = bit
    else if (i === 8) m[7][8] = bit
    else m[14 - i][8] = bit
    // Top-right + bottom-left
    if (i < 8) m[n - 1 - i][8] = bit
    else m[8][n - 15 + i] = bit
  }
  m[n - 8][8] = 1 // dark module
}

function placeVersion(m: Matrix, version: number) {
  if (version < 7) return
  const bits = VERSION_INFO[version]
  const n = m.length
  for (let i = 0; i < 18; i++) {
    const bit = (bits >> i) & 1
    const y = Math.floor(i / 3)
    const x = (i % 3) + n - 11
    m[y][x] = bit
    m[x][y] = bit
  }
}

function evaluateMask(m: Matrix): number {
  // Penalty rules (simplified — sufficient for picking a sane mask).
  const n = m.length
  let penalty = 0
  // Rule 1: runs of 5+ same-colour modules.
  for (let y = 0; y < n; y++) {
    let run = 1
    for (let x = 1; x < n; x++) {
      if (m[y][x] === m[y][x - 1]) run++
      else { if (run >= 5) penalty += 3 + (run - 5); run = 1 }
    }
    if (run >= 5) penalty += 3 + (run - 5)
  }
  for (let x = 0; x < n; x++) {
    let run = 1
    for (let y = 1; y < n; y++) {
      if (m[y][x] === m[y - 1][x]) run++
      else { if (run >= 5) penalty += 3 + (run - 5); run = 1 }
    }
    if (run >= 5) penalty += 3 + (run - 5)
  }
  // Rule 2: 2x2 blocks of same colour.
  for (let y = 0; y < n - 1; y++) {
    for (let x = 0; x < n - 1; x++) {
      if (m[y][x] === m[y][x + 1] && m[y][x] === m[y + 1][x] && m[y][x] === m[y + 1][x + 1]) {
        penalty += 3
      }
    }
  }
  return penalty
}

function pickMask(buildMatrix: (mask: number) => Matrix): number {
  let best = 0
  let bestScore = Infinity
  for (let mask = 0; mask < 8; mask++) {
    const m = buildMatrix(mask)
    const s = evaluateMask(m)
    if (s < bestScore) { bestScore = s; best = mask }
  }
  return best
}

function buildQrMatrix(data: Uint8Array): Matrix | null {
  const version = pickVersion(data.length)
  if (version < 0) return null
  const bits = buildBitStream(data, version)
  const codewords = buildCodewords(bits, version)
  const n = size(version)

  function build(mask: number): Matrix {
    const { m, r } = newMatrix(n)
    placeFinder(m, r, 0, 0)
    placeFinder(m, r, n - 7, 0)
    placeFinder(m, r, 0, n - 7)
    // Separator bands are zeros — already 0 in the matrix; mark reserved.
    for (let i = 0; i < 8; i++) {
      for (const [y, x] of [[7, i], [i, 7], [7, n - 1 - i], [n - 1 - i, 7], [n - 8, i], [i, n - 8]] as [number, number][]) {
        if (y >= 0 && x >= 0 && y < n && x < n) r[y][x] = true
      }
    }
    const centres = ALIGNMENT_CENTRES[version - 1]
    for (const cy of centres) {
      for (const cx of centres) {
        // Skip overlap with finder patterns.
        if ((cx === 6 && cy === 6) || (cx === n - 7 && cy === 6) || (cx === 6 && cy === n - 7)) continue
        placeAlignment(m, r, cx, cy)
      }
    }
    placeTimings(m, r)
    reserveFormat(r)
    reserveVersion(r, version)
    // Dark module (always 1).
    m[n - 8][8] = 1
    placeData(m, r, codewords)
    applyMask(m, r, mask)
    placeFormat(m, mask)
    placeVersion(m, version)
    return m
  }

  const mask = pickMask(build)
  return build(mask)
}

// ---------- SVG rendering ----------
export function renderQrSvg(text: string, opts: { scale?: number; margin?: number } = {}): string {
  const scale = opts.scale ?? 4
  const margin = opts.margin ?? 4
  // UTF-8 encode.
  const bytes = new TextEncoder().encode(text)
  const m = buildQrMatrix(bytes)
  if (!m) {
    // Fallback — render text as SVG.
    return `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="40"><text x="0" y="20" font-family="monospace" font-size="10">${escapeXml(text)}</text></svg>`
  }
  const n = m.length
  const dim = (n + margin * 2) * scale
  let path = ""
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      if (m[y][x] === 1) {
        path += `M${(x + margin) * scale},${(y + margin) * scale}h${scale}v${scale}h-${scale}z`
      }
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${dim}" height="${dim}" viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges"><rect width="${dim}" height="${dim}" fill="#fff"/><path d="${path}" fill="#000"/></svg>`
}

function escapeXml(s: string): string {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;")
}
