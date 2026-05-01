/**
 * Settings sub-router.
 *
 * Foundation Blue mounts this at `/settings/*` in the app router. We own
 * the children and the shared layout; Foundation owns the path prefix.
 *
 * Usage (Foundation Blue):
 *
 *   import SettingsRoutes from "./screens/settings"
 *   …
 *   <Route path="/settings/*" element={<SettingsRoutes />} />
 */
import { Route, Routes } from "react-router-dom"
import About from "./About"
import Backup from "./Backup"
import Currency from "./Currency"
import Language from "./Language"
import Networks from "./Networks"
import Security from "./Security"
import Settings from "./Settings"
import ThemeScreen from "./Theme"

export default function SettingsRoutes() {
  return (
    <Routes>
      <Route index element={<Settings />} />
      <Route path="networks" element={<Networks />} />
      <Route path="security" element={<Security />} />
      <Route path="backup" element={<Backup />} />
      <Route path="language" element={<Language />} />
      <Route path="theme" element={<ThemeScreen />} />
      <Route path="currency" element={<Currency />} />
      <Route path="about" element={<About />} />
    </Routes>
  )
}

export { About, Backup, Currency, Language, Networks, Security, Settings, ThemeScreen }
