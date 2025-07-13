# LuxKit Integration Guide

This document describes the LuxKit integration in the Lux Wallet project.

## Overview

LuxKit is a fork of RabbyKit that provides a modern wallet connection experience with support for multiple wallets and chains. It's been integrated into the Lux Wallet to provide seamless wallet connections for the Lux ecosystem.

## Key Features

- **Multi-wallet Support**: Supports Lux Wallet, Bridge, Ringtail, X-Chain, Rabby, MetaMask, and more
- **Multi-chain Support**: Works with Ethereum, BSC, Polygon, Avalanche, and Lux Network
- **Modern UI**: Beautiful modal interface with dark mode support
- **Special Features**:
  - Bridge wallet with MPC capabilities
  - Ringtail wallet with zero-knowledge proof signatures
  - X-Chain wallet with cross-chain operations
  - Full Rabby wallet integration

## Installation

The integration uses a local version of LuxKit from the adjacent repository:

```json
{
  "dependencies": {
    "luxkit": "file:../kit/packages/luxkit",
    "@wagmi/core": "2.6.9",
    "@wagmi/connectors": "^4.1.14",
    "wagmi": "^2.12.7",
    "viem": "^2.9.2"
  }
}
```

## Usage

### Basic Setup

```typescript
import { createModal, getDefaultConfig } from 'luxkit';
import { createConfig } from '@wagmi/core';

// Create wagmi config
const config = createConfig({
  chains: [mainnet, luxChain],
  transports: getDefaultConfig({
    appName: 'Lux Wallet',
    projectId: 'YOUR_PROJECT_ID',
  }).transports,
});

// Create LuxKit modal
const modal = createModal({
  wagmi: config,
  appInfo: {
    name: 'Lux Wallet',
    description: 'Official Lux Network wallet',
  },
  theme: 'dark',
});
```

### Opening the Modal

```typescript
// Open wallet connection modal
modal.open();

// Open specific view
modal.open({ view: 'Connect' });
modal.open({ view: 'Networks' });
modal.open({ view: 'Account' });
```

### Wallet Prioritization

The integration prioritizes Lux ecosystem wallets:

```typescript
walletList: [
  { walletName: 'lux', showQRCode: true },
  { walletName: 'bridge', showQRCode: false },
  { walletName: 'ringtail', showQRCode: false },
  { walletName: 'xchain', showQRCode: false },
  { walletName: 'rabby', showQRCode: true },
  // ... other wallets
]
```

## File Structure

```
packages/kit-bg/src/connectors/luxkit/
├── LuxKitProvider.ts      # Main provider configuration
├── LuxKitConnector.ts     # Wallet connector implementation
├── example-usage.ts       # Usage examples
└── test-integration.ts    # Integration tests
```

## Custom Chain Configuration

The Lux Network chain is configured as:

```typescript
const luxChain = {
  id: 7777777,
  name: 'Lux Network',
  nativeCurrency: {
    decimals: 18,
    name: 'Lux',
    symbol: 'LUX',
  },
  rpcUrls: {
    default: { http: ['https://api.lux.network'] },
  },
  blockExplorers: {
    default: { name: 'LuxScan', url: 'https://explorer.lux.network' },
  },
};
```

## Special Wallet Features

### Bridge Wallet
- Multi-Party Computation (MPC) for secure key management
- Cross-chain asset bridging capabilities

### Ringtail Wallet
- Zero-knowledge proof signatures for privacy
- Enhanced security features

### X-Chain Wallet
- Cross-chain operation execution
- Integration with Ringtail signatures

## Testing

Run the integration test:

```bash
yarn workspace @onekeyhq/kit-bg lint
```

## Next Steps

1. **Publish Forked Packages**: The forked packages (@luxfi/mipd, etc.) need to be published to npm
2. **Complete Bridge Implementation**: Implement actual MPC functionality for Bridge wallet
3. **Implement ZK Proofs**: Complete zero-knowledge proof generation for Ringtail
4. **Add Cross-chain Operations**: Implement X-Chain wallet functionality
5. **Integration Testing**: Test wallet connections with real dApps

## Troubleshooting

### Missing Dependencies
If you encounter missing dependency errors, ensure all wagmi-related packages are installed:

```bash
yarn add @wagmi/core @wagmi/connectors wagmi viem
```

### Build Errors
If the luxkit package fails to build, check:
1. SVG imports are handled by the custom loader
2. All peer dependencies are satisfied
3. The build command: `cd ../kit && pnpm build:kit`

## References

- [LuxKit Repository](../kit/packages/luxkit)
- [RabbyKit Documentation](https://rabbykit.rabby.io)
- [Wagmi Documentation](https://wagmi.sh)
- [Viem Documentation](https://viem.sh)