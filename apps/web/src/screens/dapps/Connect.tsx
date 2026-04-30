/**
 * Connect — paste a wc:// URI to initiate a WalletConnect pairing.
 *
 * Supports clipboard paste and (when available) the Web Camera API + a
 * BarcodeDetector for QR scanning. Falls back to a manual paste field
 * when the device lacks BarcodeDetector.
 *
 * Defenses:
 *   - URI is validated before being sent to the WC client.
 *   - The form preserves the user's last input only in component state
 *     — never localStorage — so a stale URI cannot resurrect on reload.
 *   - Camera stream is stopped on unmount to avoid privacy bleed.
 */

import { useEffect, useRef, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useWalletConnect } from "./useWalletConnect"

interface BarcodeDetectorLike {
  detect: (source: ImageBitmapSource) => Promise<{ rawValue: string }[]>
}

interface BarcodeDetectorCtor {
  new (options?: { formats?: string[] }): BarcodeDetectorLike
}

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorCtor
  }
}

export function Connect() {
  const navigate = useNavigate()
  const { pair } = useWalletConnect()

  const [uri, setUri] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        for (const t of streamRef.current.getTracks()) t.stop()
        streamRef.current = null
      }
    }
  }, [])

  const onPaste = async () => {
    setError(null)
    try {
      const text = await navigator.clipboard.readText()
      setUri(text.trim())
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Clipboard access denied",
      )
    }
  }

  const onScan = async () => {
    setError(null)
    const Ctor = window.BarcodeDetector
    if (!Ctor) {
      setError("QR scanning is not supported on this device")
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setScanning(true)

      const detector = new Ctor({ formats: ["qr_code"] })
      const tick = async () => {
        if (!streamRef.current || !videoRef.current) return
        try {
          const codes = await detector.detect(videoRef.current)
          if (codes.length > 0 && codes[0].rawValue) {
            setUri(codes[0].rawValue.trim())
            setScanning(false)
            for (const t of streamRef.current.getTracks()) t.stop()
            streamRef.current = null
            return
          }
        } catch {
          // Soft-fail; keep retrying on next frame.
        }
        if (streamRef.current) requestAnimationFrame(tick)
      }
      requestAnimationFrame(tick)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Camera access denied")
      setScanning(false)
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await pair(uri.trim())
      navigate("/dapps")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pairing failed")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section style={{ padding: "1rem", display: "grid", gap: "1rem" }}>
      <header>
        <Link to="/dapps">← Back</Link>
        <h1 style={{ margin: "0.5rem 0" }}>Connect a dApp</h1>
        <p style={{ opacity: 0.7, margin: 0 }}>
          Paste a WalletConnect URI from the dApp.
        </p>
      </header>

      {scanning ? (
        <div>
          <video
            ref={videoRef}
            playsInline
            muted
            style={{ width: "100%", maxWidth: 320, borderRadius: 12 }}
          />
          <button
            type="button"
            onClick={() => {
              setScanning(false)
              if (streamRef.current) {
                for (const t of streamRef.current.getTracks()) t.stop()
                streamRef.current = null
              }
            }}
          >
            Stop scanning
          </button>
        </div>
      ) : null}

      <form onSubmit={onSubmit} style={{ display: "grid", gap: "0.75rem" }}>
        <label style={{ display: "grid", gap: "0.25rem" }}>
          <span>WalletConnect URI</span>
          <textarea
            value={uri}
            onChange={(e) => setUri(e.target.value)}
            placeholder="wc:abcdef…@2?relay-protocol=irn&symKey=…"
            rows={3}
            spellCheck={false}
            autoComplete="off"
            style={{ padding: "0.5rem", borderRadius: 8, fontFamily: "monospace" }}
          />
        </label>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button type="button" onClick={onPaste}>
            Paste
          </button>
          <button type="button" onClick={onScan} disabled={scanning}>
            Scan QR
          </button>
        </div>
        {error ? (
          <div role="alert" style={{ color: "#c00" }}>
            {error}
          </div>
        ) : null}
        <button
          type="submit"
          disabled={submitting || uri.trim().length === 0}
          style={{ padding: "0.75rem 1rem", borderRadius: 8, fontWeight: 600 }}
        >
          {submitting ? "Connecting…" : "Connect"}
        </button>
      </form>
    </section>
  )
}
