/**
 * ActiveSessions — list of approved WalletConnect sessions with permissions
 * and a Disconnect button per session.
 *
 * Each row exposes: dApp name+url, granted chains, granted methods, expiry
 * countdown.
 */

import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { useDAppsStore, type DAppSession } from "../../store/dapps"
import { useWalletConnect } from "./useWalletConnect"

function timeLeft(expiry: number): string {
  const seconds = Math.max(0, expiry - Math.floor(Date.now() / 1000))
  if (seconds === 0) return "expired"
  const days = Math.floor(seconds / 86400)
  if (days >= 2) return `${days}d`
  const hours = Math.floor(seconds / 3600)
  if (hours >= 2) return `${hours}h`
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m`
}

function chainsLabel(chains: string[]): string {
  if (chains.length === 0) return "No chains"
  if (chains.length === 1) return chains[0]
  return `${chains.length} chains`
}

function SessionRow({ session }: { session: DAppSession }) {
  const { disconnect } = useWalletConnect()
  const [busy, setBusy] = useState(false)
  const [, force] = useState(0)

  // Re-render once a minute to keep the countdown fresh.
  useEffect(() => {
    const id = window.setInterval(() => force((n) => n + 1), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const onDisconnect = async () => {
    setBusy(true)
    try {
      await disconnect(session.topic)
    } finally {
      setBusy(false)
    }
  }

  let host = "(invalid url)"
  try {
    host = new URL(session.peer.url).host
  } catch {
    /* keep fallback */
  }

  return (
    <li
      style={{
        listStyle: "none",
        padding: "0.75rem",
        border: "1px solid rgba(127,127,127,0.2)",
        borderRadius: 12,
        display: "grid",
        gap: "0.25rem",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
        <strong>{session.peer.name || host}</strong>
        <span style={{ fontSize: 12, opacity: 0.7 }}>
          expires in {timeLeft(session.expiry)}
        </span>
      </div>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{host}</div>
      <div style={{ fontSize: 12 }}>
        Chains: {chainsLabel(session.chains)} · Methods:{" "}
        {session.methods.length}
      </div>
      <details style={{ fontSize: 12 }}>
        <summary>Permissions</summary>
        <div style={{ marginTop: "0.25rem" }}>
          <div>
            <strong>Chains:</strong>{" "}
            {session.chains.length === 0 ? "—" : session.chains.join(", ")}
          </div>
          <div>
            <strong>Methods:</strong>{" "}
            {session.methods.length === 0 ? "—" : session.methods.join(", ")}
          </div>
          <div>
            <strong>Events:</strong>{" "}
            {session.events.length === 0 ? "—" : session.events.join(", ")}
          </div>
        </div>
      </details>
      <div>
        <button type="button" onClick={onDisconnect} disabled={busy}>
          {busy ? "Disconnecting…" : "Disconnect"}
        </button>
      </div>
    </li>
  )
}

export function ActiveSessions() {
  const sessions = useDAppsStore((s) => s.sessions)
  const initializing = useDAppsStore((s) => s.initializing)
  const error = useDAppsStore((s) => s.error)
  const { pendingProposals } = useWalletConnect()

  return (
    <section style={{ padding: "1rem", display: "grid", gap: "1rem" }}>
      <header>
        <Link to="/dapps">← Back</Link>
        <h1 style={{ margin: "0.5rem 0" }}>Connected dApps</h1>
      </header>

      {error ? (
        <div role="alert" style={{ color: "#c00" }}>
          {error}
        </div>
      ) : null}

      {pendingProposals.length > 0 ? (
        <div role="status" style={{ opacity: 0.8 }}>
          {pendingProposals.length} pending proposal
          {pendingProposals.length > 1 ? "s" : ""} awaiting confirmation.
        </div>
      ) : null}

      {sessions.length === 0 ? (
        <p style={{ opacity: 0.7 }}>
          {initializing ? "Loading sessions…" : "No active sessions."}{" "}
          <Link to="/dapps/connect">Connect a dApp</Link>.
        </p>
      ) : (
        <ul
          style={{
            display: "grid",
            gap: "0.75rem",
            padding: 0,
            margin: 0,
          }}
        >
          {sessions.map((s) => (
            <SessionRow key={s.topic} session={s} />
          ))}
        </ul>
      )}
    </section>
  )
}
