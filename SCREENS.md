# Lux Wallet — Screen Specifications

**Status**: Authoritative UX reference for Lux Wallet 3.0 (mobile, desktop, browser extension).
**Spec freeze**: 2025-12-15.
**Activation**: 2025-12-25 alongside Zoo 3.0 launch and Lux Quasar 3.0 mainnet upgrade.
**Form factors**: browser extension, iOS, Android, Lux Desktop app.

The Lux Wallet is the canonical signing surface for the Lux ecosystem. Zoo L1 appears as a chain target alongside Lux P/C/X/Q/Z/A/B/M/F-Chains. This document specifies every screen with text mockups, flow descriptions, edge cases, and the chain-routing logic.

Cross-references:
- `zoo-3-0-launch` paper §10 (Lux Wallet and Desktop)
- `zoo-per-llm-chains` paper (per-LLM tokens displayed in portfolio)
- LP-020 (Quasar 3.0 triple-consensus finality display)
- LP-013 (F-Chain FHE confidential mode)
- LP-063 (Z-Chain ZKP selective disclosure)
- LP-134 (chain topology — chain selector contents)

---

## 1. Account / Portfolio View

### Purpose

Top-level dashboard. Aggregates balances across all Lux ecosystem chains and Zoo-specific assets. Default landing screen on app open.

### Mockup (mobile-first; desktop expands columns)

```
┌─────────────────────────────────────────┐
│  Lux Wallet                    🔒 ⚙  │
├─────────────────────────────────────────┤
│  Account: zach.lux                       │
│  0xA1B2…3F4E              [copy]  [QR]   │
├─────────────────────────────────────────┤
│  Total value (USD)                       │
│  $42,718.93           ▲ 2.4% 24h        │
├─────────────────────────────────────────┤
│  Assets                  Privacy:  ○ off │
│                                          │
│  $LUX                  1,250.00          │
│   P-Chain stake          800.00          │
│   C-Chain                450.00          │
│                                          │
│  $AI                  18,432.10          │
│   A-Chain rewards       1,432.10         │
│   Hanzo earnings       17,000.00         │
│                                          │
│  $ZOO                100,000.00          │
│   Zoo L1 native       95,000.00          │
│   Bridged (Eth)        5,000.00          │
│                                          │
│  Per-LLM tokens                          │
│   ZEN4-NANO            8,250             │
│   ZEN4-MINI            4,120             │
│   ZEN4-LARGE             340             │
│                                          │
│  NFTs                       12 items     │
│   [thumb] [thumb] [thumb] [+9 more]      │
│                                          │
│  Confidential (F-Chain)     2 assets     │
│   ●●●●●● $ZOO               [unwrap]    │
│   ●●●●●● ZEN4-ULTRA         [unwrap]    │
├─────────────────────────────────────────┤
│  [Send] [Receive] [Swap] [Stake] [Bridge]│
└─────────────────────────────────────────┘
```

### Flow

1. App launch authenticates against OS keychain or PIN.
2. Wallet pulls balances per chain in parallel; renders in priority order ($LUX, $AI, $ZOO, per-LLM, NFTs, confidential).
3. Privacy toggle in header re-routes future signing actions through F-Chain or Z-Chain (see §7).
4. Tap any asset row to open the asset detail screen (history, send, receive).
5. NFT thumbnails open the NFT detail flow with provenance chain.
6. Confidential balances show ciphertext indicators; tap unwrap to decrypt locally.

### Edge cases

- Empty wallet: full-screen onboarding card with "Create" / "Import" CTAs.
- Network failure on one chain: that asset row shows "—" with a retry icon; other rows render normally.
- New per-LLM token detected in chain emit: surfaces as "New asset detected" toast at top.

---

## 2. Send / Receive

### Purpose

Sign and broadcast outbound transactions; show receive address with QR.

### Mockup — Send

```
┌─────────────────────────────────────────┐
│  ← Send                                  │
├─────────────────────────────────────────┤
│  From: $ZOO on Zoo L1                    │
│  Balance: 95,000 ZOO                     │
│                                          │
│  To:                                     │
│  [0xC4D5…7A8B               ]  [📷 QR]   │
│                                          │
│  Amount:                                 │
│  [          1,000.00     ZOO ▼]          │
│  ≈ $245.00 USD                           │
│                                          │
│  Network fee: 0.0042 ZOO  (~$0.001)      │
│                                          │
│  Privacy: ○ off                          │
│  Finality:                               │
│   ✓ BLS classical fast-path              │
│   ⏱ Ringtail PQ threshold                │
│   ⏱ ML-DSA identity                      │
│                                          │
│           [   Sign & Send   ]            │
└─────────────────────────────────────────┘
```

### Flow

1. User selects source asset (default: most recent or current portfolio focus).
2. Address entry: paste, scan QR, pick from contacts, or resolve a `*.lux` name.
3. Amount entry with USD quote.
4. Privacy toggle (re-routes via F-Chain Confidential ERC-20 if enabled).
5. Tap Sign & Send: local signing, broadcast, show progress modal.
6. Progress modal shows triple-consensus state: BLS first (~50ms), Ringtail second (~200ms), ML-DSA third (~500ms). Three checkmarks = full QuasarCert.

### Mockup — Receive

```
┌─────────────────────────────────────────┐
│  ← Receive                               │
├─────────────────────────────────────────┤
│  Account: zach.lux                       │
│                                          │
│       ┌───────────────────────┐          │
│       │      [QR code]        │          │
│       │                       │          │
│       └───────────────────────┘          │
│                                          │
│  0xA1B2C3D4E5F6…7890ABCDEF               │
│                                          │
│  [Copy address]   [Share]                │
│                                          │
│  Chain: Zoo L1 ▼                         │
│         ↳ tap to switch chain            │
└─────────────────────────────────────────┘
```

### Flow

Chain selector at bottom changes the QR's encoded chain prefix (e.g., `lux:zoo-l1:0x…`). Default to currently focused chain in portfolio.

### Edge cases

- Insufficient balance → Sign button disabled, error inline.
- Unknown destination chain → warning banner with chain ID lookup.
- Address checksum mismatch → block submission, show error.

---

## 3. DEX Swap

### Purpose

Token-for-token swap with chain selector for routing across Lux C-Chain (Lux DEX) and Zoo L1 (Zoo DEX V2/V3/V4).

### Mockup

```
┌─────────────────────────────────────────┐
│  ← Swap                                  │
├─────────────────────────────────────────┤
│  Route: Zoo L1 (Zoo DEX V3) ▼            │
│   ▸ Lux C-Chain (Lux DEX)                │
│   ▸ Zoo L1 (Zoo DEX V2)                  │
│   ▸ Zoo L1 (Zoo DEX V3)                  │
│   ▸ Cross (Zoo V4 → Lux DEX)             │
│                                          │
│  From:                                   │
│  [   1,000.00   ] $ZOO ▼                 │
│  Balance 95,000  [Max]                   │
│                                          │
│           ⇅                              │
│                                          │
│  To:                                     │
│  [     245.10   ] $LUX ▼                 │
│  ≈ $245.00 USD                           │
│                                          │
│  Slippage: 0.5%   Price impact: 0.02%    │
│                                          │
│  Pool fee tier: 30 bps                   │
│  Network fee: 0.012 ZOO                  │
│                                          │
│           [    Review swap    ]          │
└─────────────────────────────────────────┘
```

### Flow

1. User picks From/To assets (any ZRC-20 / Lux native asset).
2. Router auto-suggests best route across the four routing options.
3. User can override route via the selector.
4. Slippage + price impact shown inline.
5. Review modal shows full path (e.g., "Zoo V4 → B-Chain hop → Lux DEX") with fee breakdown.
6. Sign and broadcast.

### Routing rules

| Source asset | Destination asset | Default route |
|---|---|---|
| ZOO L1 native | ZOO L1 native | Zoo DEX V2 or V3 |
| Lux C-Chain native | Lux C-Chain native | Lux DEX |
| Zoo L1 ↔ Lux C-Chain | cross-chain | Zoo DEX V4 (precompile to Lux DEX) |
| Per-LLM token ↔ ZOO | Zoo L1 | Zoo DEX V3 |
| NFT fractional ↔ ZOO | Zoo L1 | Zoo DEX V3 |

### Edge cases

- No liquidity on any route → blocking modal with explanation.
- Cross-chain route: separate progress states for source-chain swap, B-Chain hop, destination-chain delivery.
- Price moves > slippage tolerance during signing → fail safely with refund (no partial fills).

---

## 4. Staking

### Purpose

Delegate `$LUX` to Lux validators (P-Chain) or `$ZOO` / `$AI` to Zoo L1 validators.

### Mockup

```
┌─────────────────────────────────────────┐
│  ← Staking                               │
├─────────────────────────────────────────┤
│  Network: Zoo L1 ▼                       │
│   ▸ Lux P-Chain                          │
│   ▸ Zoo L1                               │
├─────────────────────────────────────────┤
│  Your stake                              │
│   12,500 ZOO   ↳ 3 validators            │
│   Pending rewards: 142 ZOO    [Claim]    │
├─────────────────────────────────────────┤
│  Active validators (Zoo L1)              │
│                                          │
│  [v01] zen-validator-1                   │
│   Stake: 8.2M ZOO • Uptime 99.97%        │
│   Reward 8.4% APR • Slash risk: low      │
│   [Delegate]                             │
│                                          │
│  [v02] conservation-node                 │
│   Stake: 5.1M ZOO • Uptime 99.91%        │
│   Reward 8.7% APR • Slash risk: low      │
│   [Delegate]                             │
│                                          │
│  [v03] hanzo-mining-pool                 │
│   Stake: 12.3M ZOO • Uptime 99.99%       │
│   Reward 8.1% APR • Slash risk: low      │
│   [Delegate]                             │
└─────────────────────────────────────────┘
```

### Flow

1. Network selector switches between Lux P-Chain and Zoo L1.
2. Stake summary shows current delegations and unclaimed rewards.
3. Validator list sorted by reward APR with uptime / slash risk shown.
4. Delegate flow: pick amount, confirm lock period, sign delegation transaction.
5. Slashing history pulled from A-Chain attestation feed for each validator.

### Edge cases

- Validator at capacity → grayed out with "At capacity" badge.
- Slashed validator → red banner; cannot delegate.
- Lock period not yet elapsed for unstake → countdown display.

---

## 5. Bridge

### Purpose

Move assets between Zoo L1 and external chains via Zoo Bridge (B-Chain).

### Mockup

```
┌─────────────────────────────────────────┐
│  ← Bridge                                │
├─────────────────────────────────────────┤
│  From: Zoo L1 ▼                          │
│  To:   Lux C-Chain ▼                     │
│                                          │
│   Supported destinations:                │
│   • Lux C/X/B/Z-Chain                    │
│   • Ethereum mainnet                     │
│   • Polygon                              │
│   • BSC (inbound only — legacy)          │
│   • Arbitrary EVM (generic adapter)      │
│                                          │
│  Asset:                                  │
│  [   ZOO ▼   ] [    1,000.00     ]      │
│                                          │
│  Recipient: same wallet ▼                │
│   0xA1B2…3F4E                            │
│                                          │
│  Bridge route                            │
│   1. Lock on Zoo L1                      │
│   2. M-Chain threshold sign (2-of-3)     │
│   3. Mint on Lux C-Chain                 │
│   ETA: ~30 seconds                       │
│                                          │
│  Bridge fee: 0.5 ZOO                     │
│                                          │
│           [   Confirm bridge   ]         │
└─────────────────────────────────────────┘
```

### Flow

1. Source / destination chain selectors. Default source = current chain focus; default destination = remembered last destination.
2. Asset selector filtered to bridge-supported assets.
3. Recipient defaults to "same wallet" but can be changed (with warning).
4. Route preview shows the full lock → threshold-sign → mint pipeline with ETA.
5. Confirm: signs lock TX on source, polls bridge committee, surfaces threshold ceremony progress, finalises mint event.

### Edge cases

- Unsupported asset for chosen destination → asset selector grays out unsupported entries.
- BSC outbound → blocked with "BSC inbound only — legacy migration" message.
- Threshold ceremony stalls > 5 minutes → escalation to manual review with support link.

---

## 6. AI Inference

### Purpose

Send inference queries to local Zoo AI Desktop, Zoo Cloud, or Hanzo Marketplace.

### Mockup

```
┌─────────────────────────────────────────┐
│  ← AI                                    │
├─────────────────────────────────────────┤
│  Mode:                                   │
│  ● Local (free, on-device)               │
│  ○ Zoo Cloud (pay $AI per token)         │
│  ○ Hanzo Marketplace (HMM routing)       │
│  ○ Confidential (F-Chain FHE)            │
│                                          │
│  Model:                                  │
│  zen4-mini   (eligible: device VRAM 8GB) │
│   ▸ zen4-nano                            │
│   ▸ zen4-mini ✓                          │
│   ▸ zen4-small                           │
│   ▸ zen4-medium (Zoo Cloud only)         │
│   ▸ zen4-large (Zoo Cloud only)          │
│                                          │
│  Prompt:                                 │
│  ┌─────────────────────────────────┐     │
│  │ Summarise the latest A-Chain    │     │
│  │ attestation feed for ZEN4-LARGE.│     │
│  └─────────────────────────────────┘     │
│                                          │
│  Cost: free (local)                      │
│                                          │
│           [    Send query    ]           │
├─────────────────────────────────────────┤
│  Response                                │
│  ┌─────────────────────────────────┐     │
│  │ [streaming model output…]       │     │
│  └─────────────────────────────────┘     │
│                                          │
│  Provenance: A-Chain receipt 0xF… ✓      │
└─────────────────────────────────────────┘
```

### Flow

1. Mode selector picks the routing path.
2. Model selector filters by mode (Local mode lists device-eligible models; Cloud lists all).
3. Prompt entry; cost preview updates inline (free for Local; per-token for Cloud / Marketplace).
4. Send query: local mode runs immediately on-device; Cloud mode signs a payment TX and dispatches to A-Chain attested worker; Marketplace mode signs a HMM contract invocation.
5. Response streams back; provenance receipt link opens A-Chain explorer.

### Confidential mode

When Confidential mode is selected, the prompt is encrypted under the F-Chain key before submission; the response arrives encrypted and decrypts locally. Worker never sees plaintext.

### Edge cases

- Model exceeds device VRAM in Local mode → auto-suggest Zoo Cloud upgrade.
- Cloud / Marketplace insufficient $AI balance → block submission with top-up CTA.
- Confidential mode requires F-Chain reachability; if F-Chain unreachable, fall back to standard Cloud mode with explicit user re-confirmation.

---

## 7. Privacy Mode Toggle

### Purpose

Single global toggle that re-routes future signing actions through F-Chain (FHE) or Z-Chain (ZKP) based on intent.

### Mockup

```
┌─────────────────────────────────────────┐
│  ← Privacy                               │
├─────────────────────────────────────────┤
│  Privacy mode: ● off  ○ on               │
│                                          │
│  When privacy mode is on:                │
│                                          │
│  Transfers                               │
│   → routed through F-Chain               │
│      Confidential ERC-20 (LP-067)        │
│   • Balances and amounts encrypted       │
│   • Validator never sees plaintext       │
│                                          │
│  Identity proofs                         │
│   → routed through Z-Chain               │
│      Selective disclosure (LP-063)       │
│   • Prove "I hold ≥ X" without           │
│     revealing actual balance             │
│   • Prove "I am over 18" without         │
│     revealing date of birth              │
│                                          │
│  Display                                 │
│   • Balances in portfolio show as ●●●●   │
│   • Tap to decrypt locally               │
│                                          │
│  Cost                                    │
│   • Higher per-op cost than non-private  │
│   • F-Chain ~10× standard transfer cost  │
│   • Z-Chain ~3× standard transfer cost   │
│                                          │
│           [   Apply changes   ]          │
└─────────────────────────────────────────┘
```

### Flow

1. Toggle privacy mode on/off.
2. Apply changes signs a wallet config update (local only, not on-chain).
3. Future Send / Swap / Bridge / Staking flows route through the privacy chain when privacy mode is on.
4. Portfolio view displays ciphertext indicators on confidential balances.

### Edge cases

- F-Chain or Z-Chain unreachable → privacy mode degrades to "warn before sending in cleartext" rather than silently disabling.
- Pre-existing non-private balances coexist with new private balances; toggle does not auto-migrate.
- Privacy off → previously confidential balances remain encrypted on-chain; only newly signed transactions go cleartext.

---

## 8. Form-factor parity

| Screen | Browser ext | iOS | Android | Desktop |
|---|---|---|---|---|
| Portfolio | ✓ | ✓ | ✓ | ✓ |
| Send / Receive | ✓ | ✓ | ✓ | ✓ |
| DEX Swap | ✓ | ✓ | ✓ | ✓ |
| Staking | ✓ | ✓ | ✓ | ✓ |
| Bridge | ✓ | ✓ | ✓ | ✓ |
| AI Inference | ✓ | limited (Cloud only — no local model runtime) | limited | ✓ (full local model runtime) |
| Privacy Mode | ✓ | ✓ | ✓ | ✓ |
| Validator Operator Pane | — | — | — | ✓ (desktop only) |

---

## 9. Validator Operator Pane (Desktop only)

### Purpose

For users running their own Zoo or Lux validator. Surfaces block production stats, slashing exposure, threshold-ceremony participation.

### Mockup

```
┌──────────────────────────────────────────────────────────┐
│  Validator: zen-validator-1                              │
├──────────────────────────────────────────────────────────┤
│  Stake: 8,200,000 ZOO          Uptime (24h): 99.97%     │
│  Active set: ✓                 Last block: #3,142,887    │
├──────────────────────────────────────────────────────────┤
│  Block production (last 100 epochs)                      │
│  [████████████████████████████░] 92.3%                   │
│                                                          │
│  Triple-consensus participation                          │
│  BLS:       ████████████████████ 99.99%                  │
│  Ringtail:  ████████████████████ 99.97%                  │
│  ML-DSA:    ████████████████████ 99.98%                  │
│                                                          │
│  Threshold ceremonies (M-Chain)                          │
│   24h: 142 / 142 signed                                  │
│   7d:  984 / 985 signed (1 missed at epoch 1247)         │
├──────────────────────────────────────────────────────────┤
│  Slashing risk:    low                                   │
│  Recent attestations: 24h ✓ 100%                         │
│  Pending slashes:  0                                     │
└──────────────────────────────────────────────────────────┘
```

### Flow

Read-only display. Tapping any metric drills into A-Chain explorer for the underlying attestation.

---

## 10. Settings

Standard settings tree; non-load-bearing for the launch.

- Account management (add, remove, rename, biometric unlock)
- Network endpoints (RPC overrides per chain)
- Theme (light / dark / auto)
- Telemetry (off by default)
- Backup (BIP-39 export, hardware wallet pairing)
- About / version / open source licenses

---

## 11. Activation checklist (for engineering)

- [ ] Portfolio screen renders all 9 chains in topology
- [ ] Per-LLM token detection wired to Zoo L1 chain emit feed
- [ ] DEX Swap chain selector includes Zoo L1 + Lux C-Chain + Zoo V4 cross-chain route
- [ ] Send finality progress shows triple-consensus three-step UI
- [ ] Bridge supports BSC inbound migration adapter
- [ ] AI inference Local mode auto-spawns zoo-node runtime
- [ ] Privacy mode toggle integrated with F-Chain and Z-Chain precompiles
- [ ] Validator operator pane visible only when local node detected
- [ ] All flows compatible with browser extension, mobile, and desktop form factors
- [ ] All chains in chain selector match LP-134 canonical taxonomy

---

**Owner**: Lux Wallet team. Update via PR; cross-link to `zoo-3-0-launch` paper §10.
