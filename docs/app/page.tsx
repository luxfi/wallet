import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* Hero Section */}
      <section className="flex flex-col items-center justify-center px-6 py-24 text-center">
        <div className="max-w-4xl">
          <h1 className="mb-6 text-5xl font-bold tracking-tight text-fd-foreground md:text-6xl">
            Lux Wallet
          </h1>
          <p className="mb-8 text-xl text-fd-muted-foreground md:text-2xl">
            Hierarchical deterministic wallet and key management for the Lux blockchain ecosystem.
            Secure, multi-chain support with hardware wallet integration.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/docs"
              className="rounded-lg bg-fd-primary px-8 py-3 text-lg font-semibold text-fd-primary-foreground transition-colors hover:bg-fd-primary/90"
            >
              Get Started
            </Link>
            <Link
              href="https://github.com/luxfi/wallet"
              className="rounded-lg border border-fd-border bg-fd-background px-8 py-3 text-lg font-semibold text-fd-foreground transition-colors hover:bg-fd-muted"
            >
              View on GitHub
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="border-t border-fd-border bg-fd-card px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold text-fd-foreground">
            Features
          </h2>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {/* HD Wallets */}
            <div className="rounded-xl border border-fd-border bg-fd-background p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-fd-primary/10">
                <svg
                  className="h-6 w-6 text-fd-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-xl font-semibold text-fd-foreground">
                HD Wallets
              </h3>
              <p className="text-fd-muted-foreground">
                BIP-32/39/44 compliant hierarchical deterministic wallets. Generate unlimited addresses from a single seed phrase with full derivation path support.
              </p>
            </div>

            {/* Multi-Chain */}
            <div className="rounded-xl border border-fd-border bg-fd-background p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-fd-primary/10">
                <svg
                  className="h-6 w-6 text-fd-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-xl font-semibold text-fd-foreground">
                Multi-Chain
              </h3>
              <p className="text-fd-muted-foreground">
                Native support for Lux P-Chain, X-Chain, C-Chain, and all EVM-compatible networks. Unified interface for cross-chain operations.
              </p>
            </div>

            {/* Hardware Wallets */}
            <div className="rounded-xl border border-fd-border bg-fd-background p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-fd-primary/10">
                <svg
                  className="h-6 w-6 text-fd-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-xl font-semibold text-fd-foreground">
                Hardware Wallets
              </h3>
              <p className="text-fd-muted-foreground">
                Seamless integration with Ledger and Trezor hardware wallets. Keep your private keys secure in dedicated hardware devices.
              </p>
            </div>

            {/* Signing */}
            <div className="rounded-xl border border-fd-border bg-fd-background p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-fd-primary/10">
                <svg
                  className="h-6 w-6 text-fd-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-xl font-semibold text-fd-foreground">
                Signing
              </h3>
              <p className="text-fd-muted-foreground">
                Sign transactions and messages with ECDSA (secp256k1) and Ed25519. Support for EIP-712 typed data and personal message signing.
              </p>
            </div>

            {/* Recovery */}
            <div className="rounded-xl border border-fd-border bg-fd-background p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-fd-primary/10">
                <svg
                  className="h-6 w-6 text-fd-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-xl font-semibold text-fd-foreground">
                Recovery
              </h3>
              <p className="text-fd-muted-foreground">
                Recover wallets from BIP-39 mnemonic phrases or raw private keys. Support for 12, 15, 18, 21, and 24-word recovery phrases.
              </p>
            </div>

            {/* Security */}
            <div className="rounded-xl border border-fd-border bg-fd-background p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-fd-primary/10">
                <svg
                  className="h-6 w-6 text-fd-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-xl font-semibold text-fd-foreground">
                Security
              </h3>
              <p className="text-fd-muted-foreground">
                Industry-standard encryption for key storage. Memory-safe operations with automatic key zeroization. No private keys transmitted over network.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Code Example Section */}
      <section className="border-t border-fd-border px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-8 text-center text-3xl font-bold text-fd-foreground">
            Quick Start
          </h2>
          <div className="overflow-hidden rounded-xl border border-fd-border bg-fd-card">
            <div className="border-b border-fd-border bg-fd-muted px-4 py-2">
              <span className="text-sm text-fd-muted-foreground">TypeScript</span>
            </div>
            <pre className="overflow-x-auto p-4 text-sm">
              <code className="text-fd-foreground">{`import { Wallet, HDNode } from '@luxfi/wallet'

// Create from mnemonic
const mnemonic = Wallet.generateMnemonic()
const wallet = Wallet.fromMnemonic(mnemonic)

// Derive addresses for different chains
const cChainAddress = wallet.getAddressC()
const pChainAddress = wallet.getAddressP()
const xChainAddress = wallet.getAddressX()

// Sign a transaction
const signedTx = await wallet.signTransaction(tx)`}</code>
            </pre>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-fd-border bg-fd-card px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-fd-foreground">Lux Wallet</span>
            </div>
            <div className="flex gap-8">
              <Link
                href="/docs"
                className="text-fd-muted-foreground transition-colors hover:text-fd-foreground"
              >
                Documentation
              </Link>
              <Link
                href="https://github.com/luxfi/wallet"
                className="text-fd-muted-foreground transition-colors hover:text-fd-foreground"
              >
                GitHub
              </Link>
              <Link
                href="https://lux.network"
                className="text-fd-muted-foreground transition-colors hover:text-fd-foreground"
              >
                Lux Network
              </Link>
            </div>
            <p className="text-sm text-fd-muted-foreground">
              {new Date().getFullYear()} Lux Industries. MIT License.
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
