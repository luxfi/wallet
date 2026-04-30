/**
 * Mounts at /auth. Foundation router lazy-imports this module.
 *
 *   /auth                 → Welcome (create or import)
 *   /auth/create          → CreateMnemonic (display fresh BIP-39 phrase)
 *   /auth/confirm         → ConfirmMnemonic (3-word quiz)
 *   /auth/import          → ImportMnemonic (paste existing phrase)
 *   /auth/pin             → SetPIN (6-digit setup)
 *   /auth/unlock          → Unlock (returning users)
 */
import { Route, Routes } from "react-router-dom"
import Welcome from "./Welcome"
import CreateMnemonic from "./CreateMnemonic"
import ConfirmMnemonic from "./ConfirmMnemonic"
import ImportMnemonic from "./ImportMnemonic"
import SetPIN from "./SetPIN"
import Unlock from "./Unlock"

export default function AuthRoutes() {
  return (
    <Routes>
      <Route index element={<Welcome />} />
      <Route path="create" element={<CreateMnemonic />} />
      <Route path="confirm" element={<ConfirmMnemonic />} />
      <Route path="import" element={<ImportMnemonic />} />
      <Route path="pin" element={<SetPIN />} />
      <Route path="unlock" element={<Unlock />} />
    </Routes>
  )
}

export { Welcome, CreateMnemonic, ConfirmMnemonic, ImportMnemonic, SetPIN, Unlock }
