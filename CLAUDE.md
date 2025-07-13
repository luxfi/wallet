# CLAUDE.md - Lux Wallet

This file provides guidance to Claude Code when working with the Lux Wallet repository.

## Repository Overview

This is the official Lux Wallet monorepo, a multi-platform cryptocurrency wallet supporting the Lux Network ecosystem and other major blockchains.

### Project Structure

```
/
├── apps/
│   ├── desktop/          # Electron desktop application
│   ├── ext/             # Browser extension (@luxwallet/x)
│   ├── mobile/          # React Native mobile app
│   └── web/             # Web application
├── packages/
│   ├── components/      # Shared UI components
│   ├── core/           # Core wallet logic
│   ├── kit/            # Application kit
│   ├── kit-bg/         # Background services
│   └── shared/         # Shared utilities
└── development/        # Development scripts and tools
```

## Recent Updates

### LuxKit Integration (2024)

LuxKit (a fork of RabbyKit) has been fully integrated and is now actively used in the wallet:

- **Location**: `packages/kit-bg/src/connectors/luxkit/`
- **Dependencies**: 
  - `luxkit`: Local dependency from `../kit/packages/luxkit`
  - `@wagmi/core`: 2.6.9
  - `@wagmi/connectors`: ^4.1.14
  - `wagmi`: ^2.12.7
  - `viem`: ^2.9.2
  - `@tanstack/react-query`: ^5.0.0

#### Key Files

1. **Integration Core**:
   - `packages/kit-bg/src/connectors/luxkit/LuxKitProvider.ts` - Provider configuration
   - `packages/kit-bg/src/connectors/luxkit/LuxKitConnector.ts` - Wallet connector
   - `packages/kit-bg/src/connectors/luxkit/example-usage.ts` - Usage examples

2. **React Components**:
   - `packages/kit/src/components/WalletConnect/LuxKitModal.tsx` - Modal UI component
   - `packages/kit/src/components/WalletConnect/LuxKitProvider.tsx` - React provider
   - `packages/kit/src/hooks/useLuxWalletFeatures.ts` - Special features hook
   - `packages/kit/src/views/LuxKitDemo/index.tsx` - Demo page

3. **Documentation**:
   - `LUXKIT-INTEGRATION.md` - Integration guide
   - `LUXKIT-MIGRATION-GUIDE.md` - Migration guide for developers
   - `LUXKIT-TEST-REPORT.md` - Test results and verification

4. **Integration Points**:
   - `packages/kit/src/provider/Container/index.tsx` - LuxKitProvider wrapper
   - `packages/kit/src/provider/Container/GlobalLuxKitModalContainer/` - Modal container
   - `packages/kit/src/hooks/useWalletConnection.ts` - Primary wallet hook
   - `packages/kit/src/views/DAppConnection/components/LuxKitConnectionButton/` - UI component
   - `packages/shared/src/config/walletConfig.ts` - Configuration settings

#### Supported Wallets

1. **Lux Ecosystem Wallets**:
   - Lux Wallet - Main wallet
   - Bridge Wallet - MPC-based cross-chain bridge
   - Ringtail Wallet - Zero-knowledge proof signatures
   - X-Chain Wallet - Cross-chain operations

2. **Third-party Wallets**:
   - Rabby Wallet
   - MetaMask
   - Coinbase Wallet
   - WalletConnect

#### Special Features

- **Ringtail Signatures**: Privacy-preserving signatures with ZK proofs
- **Bridge Operations**: Cross-chain asset transfers using MPC
- **Cross-chain Execution**: Execute operations across multiple chains

## Development Commands

```bash
# Install dependencies
yarn install

# Build extension
yarn workspace @luxwallet/x build:dev

# Type checking
yarn workspace @onekeyhq/kit-bg lint

# Run tests
yarn test
```

## Important Notes

1. **Package Manager**: This project uses Yarn 4.1.0 (not pnpm)
2. **Forked Dependencies**: Many dependencies are forked under @luxfi namespace
3. **Local LuxKit**: LuxKit is loaded from adjacent repository using file protocol
4. **TypeScript**: Strict typing is enforced, run type checks before committing

## Testing LuxKit Integration

1. Build LuxKit first:
   ```bash
   cd ../kit && pnpm build:kit
   ```

2. Install dependencies in wallet:
   ```bash
   yarn install
   ```

3. Test the integration:
   ```bash
   yarn workspace @onekeyhq/kit-bg lint
   ```

## Known Issues

1. Some TypeScript errors exist in the codebase (pre-existing)
2. Extension build requires missing dependencies (@luxfi/page-provider)
3. Forked packages need to be published to npm registry

## Next Steps

1. Publish forked packages to npm under @luxfi namespace
2. Implement actual Bridge wallet MPC functionality
3. Complete Ringtail ZK proof implementation
4. Add cross-chain operation support for X-Chain wallet
5. Integration testing with real dApps