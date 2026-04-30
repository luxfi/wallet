/**
 * Unit tests for parse/format helpers. Run with `node --test --import tsx`.
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import { parseUnits, formatUnits } from "./asset"

test("parseUnits: integer", () => {
  assert.equal(parseUnits("1", 18), 10n ** 18n)
})

test("parseUnits: fractional", () => {
  assert.equal(parseUnits("1.5", 18), 15n * 10n ** 17n)
})

test("parseUnits: zero", () => {
  assert.equal(parseUnits("0", 18), 0n)
})

test("parseUnits: rejects too many fractional digits", () => {
  assert.throws(() => parseUnits("0.0000000000000000001", 18))
})

test("parseUnits: rejects garbage", () => {
  assert.throws(() => parseUnits("abc", 18))
  assert.throws(() => parseUnits("1.2.3", 18))
  assert.throws(() => parseUnits("", 18))
})

test("parseUnits: negative", () => {
  assert.equal(parseUnits("-1", 18), -(10n ** 18n))
})

test("formatUnits: integer", () => {
  assert.equal(formatUnits("1000000000000000000", 18), "1")
})

test("formatUnits: fractional", () => {
  assert.equal(formatUnits("1500000000000000000", 18), "1.5")
})

test("formatUnits: zero", () => {
  assert.equal(formatUnits("0", 18), "0")
})

test("formatUnits: trims trailing zeros", () => {
  assert.equal(formatUnits("1100000000000000000", 18), "1.1")
})

test("formatUnits: less than 1 unit", () => {
  assert.equal(formatUnits("1", 18), "0.000000000000000001")
})

test("formatUnits: zero-decimal coin", () => {
  assert.equal(formatUnits("123", 0), "123")
})

test("round trip: parseUnits then formatUnits", () => {
  for (const x of ["0", "1", "1.5", "0.0000001", "1234.56789"]) {
    const big = parseUnits(x, 18)
    const back = formatUnits(big.toString(), 18)
    assert.equal(back, x === "0" ? "0" : x)
  }
})
