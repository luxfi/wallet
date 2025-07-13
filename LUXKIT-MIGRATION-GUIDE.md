# LuxKit Migration Guide

This guide helps developers migrate existing wallet connection code to use LuxKit.

## Overview

LuxKit is now integrated into the Lux Wallet to provide modern wallet connection capabilities. It works alongside the existing WalletConnect implementation.

## Key Changes

### 1. New Provider Wrapper

The app is now wrapped with `LuxKitProvider`:

```tsx
// packages/kit/src/provider/Container/index.tsx
export function Container() {
  return (
    <LuxKitProvider>
      {/* existing providers */}
    </LuxKitProvider>
  );
}
```

### 2. New Global Container

Added `GlobalLuxKitModalContainer` alongside `GlobalWalletConnectModalContainer`:

```tsx
<GlobalWalletConnectModalContainer />
<GlobalLuxKitModalContainerWrapper />
```

### 3. New Hooks

#### `useWalletConnection()`
Primary hook for wallet operations:

```tsx
import { useWalletConnection } from '@onekeyhq/kit/src/hooks/useWalletConnection';

const {
  isConnected,
  address,
  chain,
  openConnectionModal,
  disconnectWallet,
  switchToNetwork,
} = useWalletConnection();
```

#### `useLuxWalletFeatures()`
Access special wallet features:

```tsx
import { useLuxWalletFeatures } from '@onekeyhq/kit/src/hooks/useLuxWalletFeatures';

const {
  features,
  signWithRingtail,
  bridgeAssets,
  executeCrossChainOperation,
} = useLuxWalletFeatures();
```

### 4. New Components

#### `LuxKitConnectionButton`
Drop-in replacement for wallet connection buttons:

```tsx
import { LuxKitConnectionButton } from '@onekeyhq/kit/src/views/DAppConnection/components/LuxKitConnectionButton';

<LuxKitConnectionButton
  onConnect={(address) => console.log('Connected:', address)}
  onDisconnect={() => console.log('Disconnected')}
/>
```

## Migration Examples

### Before (WalletConnect only):

```tsx
// Opening wallet modal
appEventBus.emit(EAppEventBusNames.WalletConnectOpenModal, { uri });

// Connection state
const { externalWallet } = useExternalWallet();
const isConnected = !!externalWallet?.address;
```

### After (LuxKit):

```tsx
// Opening wallet modal
const { openConnectionModal } = useWalletConnection();
openConnectionModal({ preferLuxKit: true });

// Connection state
const { isConnected, address } = useWalletConnection();
```

## Configuration

Control LuxKit behavior via `walletConfig`:

```tsx
import { walletConfig } from '@onekeyhq/shared/src/config/walletConfig';

// Enable/disable LuxKit
walletConfig.enableLuxKit = true;

// Prefer LuxKit over WalletConnect
walletConfig.preferLuxKit = true;
```

## Backward Compatibility

- Existing WalletConnect integrations continue to work
- Both systems can run simultaneously
- Use `preferLuxKit` flag to control which system is preferred

## Special Features

### Ringtail Signatures (Privacy)

```tsx
const { signWithRingtail } = useLuxWalletFeatures();

const result = await signWithRingtail('Hello World');
// result: { signature, zkProof, proofType }
```

### Bridge Operations (Cross-chain)

```tsx
const { bridgeAssets } = useLuxWalletFeatures();

const txHash = await bridgeAssets({
  fromChain: 1,      // Ethereum
  toChain: 7777777,  // Lux Network
  token: '0x...',
  amount: BigInt('1000000'),
});
```

### Cross-chain Execution

```tsx
const { executeCrossChainOperation } = useLuxWalletFeatures();

const txHashes = await executeCrossChainOperation([
  {
    chainId: 1,
    target: '0x...',
    data: '0x...',
    value: BigInt('0'),
  },
]);
```

## Event Bus Integration

New event for wallet connections:

```tsx
appEventBus.on(EAppEventBusNames.WalletConnected, ({ address, chainId, connector }) => {
  console.log('Wallet connected:', { address, chainId, connector });
});
```

## Testing

1. Enable LuxKit in development:
   ```tsx
   walletConfig.enableLuxKit = true;
   walletConfig.development.logLuxKitEvents = true;
   ```

2. Test wallet connections:
   - Open DApp connection modal
   - Select different wallet types
   - Verify special features work

3. Check console for LuxKit events

## Common Issues

1. **Import Errors**: Ensure luxkit is properly installed:
   ```bash
   yarn install
   ```

2. **Type Errors**: Update TypeScript imports:
   ```tsx
   import type { WalletClient } from 'viem';
   ```

3. **Modal Not Opening**: Check if LuxKitProvider is wrapping the app

## Next Steps

1. Gradually migrate wallet connection code to use LuxKit
2. Test special wallet features (Ringtail, Bridge, X-Chain)
3. Update DApp connection flows
4. Remove legacy code once migration is complete