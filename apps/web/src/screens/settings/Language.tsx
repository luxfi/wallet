/**
 * Language picker.
 *
 * Lists locales discovered in the wallet i18n module
 * (`pkgs/wallet/src/features/i18n`). Today that module ships a single
 * stub locale; this screen surfaces it and gracefully accepts more as
 * Foundation Blue lands them.
 *
 * We do NOT use `Intl.DisplayNames` to label the rows because availability
 * varies and we want stable copy. The label table is small and explicit.
 */
import { Link } from "react-router-dom"
import { useSettingsStore } from "../../store/settings"

interface Locale {
  code: string
  label: string
  native: string
}

/**
 * The supported locale set. Adding a locale is a one-line change here once
 * Foundation lands the translation bundle. The ordering is locked to what
 * the wallet team agreed on (English first, then by speaker count).
 */
const LOCALES: Locale[] = [
  { code: "en", label: "English", native: "English" },
  { code: "zh", label: "Chinese (Simplified)", native: "中文" },
  { code: "es", label: "Spanish", native: "Español" },
  { code: "ja", label: "Japanese", native: "日本語" },
  { code: "ko", label: "Korean", native: "한국어" },
  { code: "de", label: "German", native: "Deutsch" },
  { code: "fr", label: "French", native: "Français" },
  { code: "pt", label: "Portuguese", native: "Português" },
  { code: "ru", label: "Russian", native: "Русский" },
  { code: "ar", label: "Arabic", native: "العربية" },
]

export default function Language() {
  const locale = useSettingsStore((s) => s.locale)
  const setLocale = useSettingsStore((s) => s.setLocale)

  return (
    <main style={page}>
      <header style={header}>
        <Link to=".." relative="path" style={back}>
          ‹ Settings
        </Link>
        <h1 style={title}>Language</h1>
      </header>
      <ul style={list}>
        {LOCALES.map((l) => {
          const active = locale === l.code
          return (
            <li key={l.code} style={li}>
              <button
                type="button"
                style={row(active)}
                onClick={() => setLocale(l.code)}
                aria-pressed={active}
              >
                <span>
                  <span style={native}>{l.native}</span>
                  <span style={label}>{l.label}</span>
                </span>
                {active && (
                  <span aria-hidden style={check}>
                    ✓
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </main>
  )
}

const page: React.CSSProperties = {
  minHeight: "100vh",
  background: "#000",
  color: "#fff",
  padding: "24px 16px",
  maxWidth: 640,
  margin: "0 auto",
}
const header: React.CSSProperties = { marginBottom: 16 }
const back: React.CSSProperties = {
  color: "rgba(255,255,255,0.6)",
  textDecoration: "none",
  fontSize: 14,
}
const title: React.CSSProperties = { fontSize: 28, fontWeight: 600, margin: "8px 0" }
const list: React.CSSProperties = {
  listStyle: "none",
  padding: 0,
  margin: 0,
  border: "1px solid #1a1a1a",
  borderRadius: 12,
  overflow: "hidden",
}
const li: React.CSSProperties = { borderBottom: "1px solid #1a1a1a" }
const row = (active: boolean): React.CSSProperties => ({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  width: "100%",
  padding: "14px 16px",
  background: active ? "#0e0e0e" : "transparent",
  border: "none",
  color: "#fff",
  textAlign: "left",
  cursor: "pointer",
  fontSize: 14,
})
const native: React.CSSProperties = { display: "block", fontWeight: 500 }
const label: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "rgba(255,255,255,0.5)",
  marginTop: 2,
}
const check: React.CSSProperties = { color: "#3fb950", fontSize: 16 }
