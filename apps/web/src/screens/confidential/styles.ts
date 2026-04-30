/**
 * Inline style primitives. The Foundation team owns the global theme via
 * `@hanzo/gui` v7 + `@luxfi/wallet-brand`. Until those land in this slice's
 * dependency closure, we use plain inline styles matching the existing
 * `App.tsx` surface (black bg, white fg). When Foundation ships `@hanzo/gui`,
 * this module is the seam to migrate — replace each export with `gui.YStack`,
 * `gui.Button`, etc., in one place.
 */

import type { CSSProperties } from "react"

export const colors = {
  bg: "#000",
  surface: "#0a0a0a",
  surface2: "#141414",
  border: "#222",
  borderHi: "#333",
  text: "#fff",
  textMuted: "#888",
  textDim: "#555",
  accent: "#7c5cff",
  accentHover: "#9a82ff",
  success: "#3ecf8e",
  warn: "#f5a623",
  danger: "#ff5c5c",
  ciphertext: "#2a1f4a",
} as const

export const layout: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: colors.bg,
    color: colors.text,
    fontFamily:
      "system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
    padding: "24px 16px",
    boxSizing: "border-box",
  },
  container: {
    maxWidth: 720,
    margin: "0 auto",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
    gap: 12,
  },
  card: {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  col: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  button: {
    background: colors.accent,
    color: colors.text,
    border: "none",
    borderRadius: 8,
    padding: "10px 16px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
  },
  buttonGhost: {
    background: "transparent",
    color: colors.text,
    border: `1px solid ${colors.borderHi}`,
    borderRadius: 8,
    padding: "8px 14px",
    fontSize: 14,
    cursor: "pointer",
  },
  buttonDanger: {
    background: "transparent",
    color: colors.danger,
    border: `1px solid ${colors.danger}`,
    borderRadius: 8,
    padding: "8px 14px",
    fontSize: 14,
    cursor: "pointer",
  },
  input: {
    background: colors.surface2,
    color: colors.text,
    border: `1px solid ${colors.borderHi}`,
    borderRadius: 8,
    padding: "10px 12px",
    fontSize: 14,
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "inherit",
  },
  label: {
    fontSize: 12,
    color: colors.textMuted,
    textTransform: "uppercase" as const,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  badge: {
    background: colors.ciphertext,
    color: colors.accentHover,
    padding: "2px 8px",
    borderRadius: 999,
    fontSize: 11,
    fontFamily: "ui-monospace,Menlo,Monaco,Consolas,monospace",
    border: `1px solid ${colors.accent}`,
  },
  warn: {
    background: "rgba(245,166,35,0.08)",
    border: `1px solid ${colors.warn}`,
    color: colors.warn,
    padding: "10px 12px",
    borderRadius: 8,
    fontSize: 13,
    marginBottom: 12,
  },
  modalScrim: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    zIndex: 1000,
  },
  modal: {
    background: colors.surface,
    border: `1px solid ${colors.border}`,
    borderRadius: 12,
    width: "100%",
    maxWidth: 480,
    padding: 20,
  },
  mono: {
    fontFamily: "ui-monospace,Menlo,Monaco,Consolas,monospace",
    fontSize: 12,
  },
}

export const text = {
  h1: { fontSize: 22, fontWeight: 600, margin: 0 },
  h2: { fontSize: 18, fontWeight: 600, margin: 0 },
  h3: { fontSize: 14, fontWeight: 600, margin: 0 },
  body: { fontSize: 14, lineHeight: 1.5 },
  muted: { fontSize: 13, color: colors.textMuted },
  hidden: {
    fontFamily: "ui-monospace,Menlo,Monaco,Consolas,monospace",
    fontSize: 16,
    letterSpacing: 4,
    color: colors.accentHover,
  },
} as const

export const LOCK = "🔒"
export const UNLOCK = "🔓"
