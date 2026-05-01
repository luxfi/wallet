/**
 * Theme picker — dark / light / system.
 *
 * The applied theme attribute (`document.documentElement.dataset.theme`) is
 * owned by Foundation Blue's root effect; this screen only writes the
 * choice to the settings store. Foundation reacts to the store and applies
 * the visual changes app-wide.
 */
import { Link } from "react-router-dom"
import { useSettingsStore, type Theme } from "../../store/settings"

const CHOICES: { value: Theme; label: string; hint: string }[] = [
  { value: "system", label: "System", hint: "Follow your device setting" },
  { value: "dark", label: "Dark", hint: "Always use dark theme" },
  { value: "light", label: "Light", hint: "Always use light theme" },
]

export default function ThemeScreen() {
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)

  return (
    <main style={page}>
      <header style={header}>
        <Link to=".." relative="path" style={back}>
          ‹ Settings
        </Link>
        <h1 style={title}>Theme</h1>
      </header>
      <fieldset style={fieldset}>
        <legend style={srOnly}>Theme</legend>
        {CHOICES.map((c) => (
          <label key={c.value} style={row(theme === c.value)}>
            <input
              type="radio"
              name="theme"
              value={c.value}
              checked={theme === c.value}
              onChange={() => setTheme(c.value)}
              style={srOnly}
            />
            <span style={col}>
              <span style={label}>{c.label}</span>
              <span style={hint}>{c.hint}</span>
            </span>
            {theme === c.value && (
              <span aria-hidden style={check}>
                ✓
              </span>
            )}
          </label>
        ))}
      </fieldset>
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
const fieldset: React.CSSProperties = {
  border: "1px solid #1a1a1a",
  borderRadius: 12,
  padding: 0,
  margin: 0,
  overflow: "hidden",
}
const row = (active: boolean): React.CSSProperties => ({
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "14px 16px",
  background: active ? "#0e0e0e" : "transparent",
  borderBottom: "1px solid #1a1a1a",
  cursor: "pointer",
})
const col: React.CSSProperties = { flex: 1 }
const label: React.CSSProperties = { display: "block", fontWeight: 500, fontSize: 14 }
const hint: React.CSSProperties = {
  display: "block",
  fontSize: 12,
  color: "rgba(255,255,255,0.5)",
  marginTop: 2,
}
const check: React.CSSProperties = { color: "#3fb950", fontSize: 16 }
const srOnly: React.CSSProperties = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  border: 0,
}
