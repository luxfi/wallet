/**
 * Example usage of LuxKit in Lux Wallet
 * 
 * This demonstrates how to integrate LuxKit with the existing wallet infrastructure
 */

import { createModal, getDefaultConfig } from 'luxkit';
import { createConfig } from '@wagmi/core';
import { mainnet, polygon, avalanche, bsc } from '@wagmi/core/chains';
import { injected, walletConnect, coinbaseWallet } from '@wagmi/connectors';

// Define Lux Network chain
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
    public: { http: ['https://api.lux.network'] },
  },
  blockExplorers: {
    default: { name: 'LuxScan', url: 'https://explorer.lux.network' },
  },
} as const;

// Create wagmi config with multiple chains
const config = createConfig({
  chains: [mainnet, polygon, avalanche, bsc, luxChain],
  connectors: [
    injected(),
    walletConnect({
      projectId: process.env.WALLETCONNECT_PROJECT_ID || '',
    }),
    coinbaseWallet({
      appName: 'Lux Wallet',
    }),
  ],
  transports: getDefaultConfig({
    appName: 'Lux Wallet',
    projectId: process.env.WALLETCONNECT_PROJECT_ID || '',
  }).transports,
});

// Create LuxKit modal instance
export const luxKitModal = createModal({
  wagmi: config,
  appInfo: {
    name: 'Lux Wallet',
    description: 'The official wallet for the Lux Network ecosystem',
    icon: '/lux-icon.png',
  },
  theme: 'dark',
  themeVariables: {
    accentColor: '#6B46C1',
    accentColorForeground: 'white',
    borderRadius: 'medium',
    fontStack: 'system',
  },
  // Prioritize Lux ecosystem wallets
  walletList: [
    { walletName: 'lux', showQRCode: true },
    { walletName: 'bridge', showQRCode: false },
    { walletName: 'ringtail', showQRCode: false },
    { walletName: 'xchain', showQRCode: false },
    { walletName: 'rabby', showQRCode: true },
    { walletName: 'metamask', showQRCode: false },
    { walletName: 'coinbase', showQRCode: true },
    { walletName: 'walletconnect', showQRCode: true },
  ],
  features: {
    analytics: true,
    email: false,
    socials: ['google', 'github', 'discord'],
    emailShowWallets: false,
    swaps: true,
    onramp: true,
  },
});

// Usage examples:

// 1. Open the modal programmatically
export const openWalletModal = () => {
  luxKitModal.open();
};

// 2. Connect to a specific wallet
export const connectToLuxWallet = async () => {
  luxKitModal.open({ view: 'Connect' });
};

// 3. Subscribe to connection events
luxKitModal.subscribeState((state) => {
  console.log('LuxKit state:', state);
  
  if (state.open) {
    console.log('Modal opened');
  }
  
  if (state.selectedNetworkId) {
    console.log('Network selected:', state.selectedNetworkId);
  }
});

// 4. Get current account info
export const getAccountInfo = () => {
  const state = luxKitModal.getState();
  return {
    address: state.address,
    isConnected: state.isConnected,
    selectedNetworkId: state.selectedNetworkId,
  };
};

// 5. Disconnect wallet
export const disconnectWallet = () => {
  luxKitModal.disconnect();
};

// Export config for use in other parts of the app
export { config as wagmiConfig };