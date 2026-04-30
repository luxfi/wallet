/**
 * Send store tests.
 */
import { test } from "node:test"
import assert from "node:assert/strict"
import { useSendStore } from "./send"

test("send store: initial state", () => {
  useSendStore.getState().reset()
  const s = useSendStore.getState()
  assert.equal(s.to, "")
  assert.equal(s.amount, "")
  assert.equal(s.memo, "")
  assert.equal(s.asset, null)
  assert.equal(s.status, "idle")
  assert.equal(s.txHash, null)
  assert.equal(s.error, null)
})

test("send store: setters update fields", () => {
  useSendStore.getState().reset()
  useSendStore.getState().setTo("0xabc")
  useSendStore.getState().setAmount("1.5")
  useSendStore.getState().setMemo("rent")
  useSendStore.getState().setStatus("preview")
  useSendStore.getState().setTxHash("0xdeadbeef")
  useSendStore.getState().setError("oops")
  const s = useSendStore.getState()
  assert.equal(s.to, "0xabc")
  assert.equal(s.amount, "1.5")
  assert.equal(s.memo, "rent")
  assert.equal(s.status, "preview")
  assert.equal(s.txHash, "0xdeadbeef")
  assert.equal(s.error, "oops")
})

test("send store: reset clears everything", () => {
  useSendStore.getState().setTo("0xabc")
  useSendStore.getState().setAmount("1.5")
  useSendStore.getState().setStatus("done")
  useSendStore.getState().reset()
  const s = useSendStore.getState()
  assert.equal(s.to, "")
  assert.equal(s.amount, "")
  assert.equal(s.status, "idle")
  assert.equal(s.txHash, null)
})
