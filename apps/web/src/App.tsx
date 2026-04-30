import { brand } from "@luxfi/wallet-brand"

export default function App() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--surface1, #000)",
        color: "var(--neutral1, #fff)",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>{brand.walletName || "Lux Wallet"}</h1>
        <p style={{ color: "var(--neutral2, #888)" }}>{brand.description || "Self-custodial wallet"}</p>
      </div>
    </main>
  )
}
