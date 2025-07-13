// Test file to verify LuxKit integration
import { createModal } from 'luxkit';
import type { WalletList } from 'luxkit';
import { createConfig } from '@wagmi/core';
import { mainnet } from '@wagmi/core/chains';

// Test that we can import and use LuxKit
const testConfig = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: () => ({ request: async () => null } as any),
  },
});

// For now, we'll just test the basic import
const testModal = createModal({
  wagmi: testConfig,
  appInfo: {
    name: 'Lux Wallet Test',
    description: 'Testing LuxKit integration',
  },
});

console.log('LuxKit integration test successful!');
console.log('Modal created:', !!testModal);

export { testModal };