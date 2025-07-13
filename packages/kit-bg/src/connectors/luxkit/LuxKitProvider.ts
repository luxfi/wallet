import { createModal, getDefaultConfig } from 'luxkit';
import { createConfig, http } from '@wagmi/core';
import { 
  mainnet, 
  polygon, 
  bsc, 
  avalanche, 
  arbitrum, 
  optimism
} from '@wagmi/core/chains';
import type { Chain } from '@wagmi/core/chains';

// Define custom Lux chain
const luxChain: Chain = {
  id: 7777777, // Replace with actual Lux chain ID
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
    default: { name: 'Lux Explorer', url: 'https://explorer.lux.network' },
  },
};

// Additional Lux ecosystem chains
const bridgeChain: Chain = {
  id: 7777778,
  name: 'Bridge Network',
  nativeCurrency: {
    decimals: 18,
    name: 'Bridge',
    symbol: 'BRIDGE',
  },
  rpcUrls: {
    default: { http: ['https://bridge.lux.network'] },
  },
  blockExplorers: {
    default: { name: 'Bridge Explorer', url: 'https://explorer.bridge.lux.network' },
  },
};

const ringtailChain: Chain = {
  id: 7777779,
  name: 'Ringtail Network',
  nativeCurrency: {
    decimals: 18,
    name: 'Ringtail',
    symbol: 'RING',
  },
  rpcUrls: {
    default: { http: ['https://ringtail.lux.network'] },
  },
  blockExplorers: {
    default: { name: 'Ringtail Explorer', url: 'https://explorer.ringtail.lux.network' },
  },
};

const xChain: Chain = {
  id: 7777780,
  name: 'X-Chain Network',
  nativeCurrency: {
    decimals: 18,
    name: 'X-Chain',
    symbol: 'X',
  },
  rpcUrls: {
    default: { http: ['https://xchain.lux.network'] },
  },
  blockExplorers: {
    default: { name: 'X-Chain Explorer', url: 'https://explorer.xchain.lux.network' },
  },
};

// Define supported chains including Lux ecosystem chains
export const chains = [
  luxChain, 
  bridgeChain,
  ringtailChain,
  xChain,
  mainnet, 
  polygon, 
  bsc, 
  avalanche, 
  arbitrum, 
  optimism
] as const;

// Create wagmi config using the latest LuxKit pattern
export const wagmiConfig = createConfig(
  getDefaultConfig({
    appName: 'Lux Wallet',
    projectId: process.env.WALLETCONNECT_PROJECT_ID || '',
    chains,
    transports: {
      [luxChain.id]: http('https://api.lux.network'),
      [bridgeChain.id]: http('https://bridge.lux.network'),
      [ringtailChain.id]: http('https://ringtail.lux.network'),
      [xChain.id]: http('https://xchain.lux.network'),
      [mainnet.id]: http(),
      [polygon.id]: http(),
      [bsc.id]: http(),
      [avalanche.id]: http(),
      [arbitrum.id]: http(),
      [optimism.id]: http(),
    },
  })
);

// Create LuxKit modal
let modal: ReturnType<typeof createModal> | null = null;

export function getOrCreateModal() {
  if (!modal) {
    modal = createModal({
      appName: 'Lux Wallet',
      projectId: process.env.WALLETCONNECT_PROJECT_ID || '',
      wagmiConfig,
      chains,
      theme: 'dark' as const,
      themeVariables: {
        accentColor: '#6B46C1', // Lux purple
        accentColorForeground: 'white',
        borderRadius: 'medium',
        fontStack: 'system',
        overlayBlur: 'small',
      },
      coolMode: true,
      // Customize wallet list to prioritize Lux ecosystem wallets
      walletList: [
        {
          walletName: 'lux',
          showQRCode: true,
        },
        {
          walletName: 'rabby',
          showQRCode: true,
        },
        {
          walletName: 'bridge',
          showQRCode: true,
        },
        {
          walletName: 'ringtail',
          showQRCode: true,
        },
        {
          walletName: 'xchain',
          showQRCode: true,
        },
        {
          walletName: 'metamask',
          showQRCode: false,
        },
        {
          walletName: 'walletconnect',
          showQRCode: true,
        },
      ],
    });
  }
  return modal;
}

// Export provider setup function
export function setupLuxKitProvider() {
  const modal = getOrCreateModal();
  
  return {
    wagmiConfig,
    modal,
    chains,
  };
}

// Helper function to check if LuxKit is supported
export function isLuxKitSupported(): boolean {
  return typeof window !== 'undefined' && !!window.ethereum;
}

// Helper function to get connected account
export async function getConnectedAccount() {
  const account = wagmiConfig.state.current;
  
  if (!account) return null;
  
  return {
    address: account,
    connector: wagmiConfig.state.connections.get(account)?.connector,
    chainId: wagmiConfig.state.chainId,
  };
}

// Lux-specific wallet features
export const luxWalletFeatures = {
  // Bridge feature configuration
  bridge: {
    enabled: true,
    supportedChains: chains.map(c => c.id),
    contracts: {
      // Add bridge contract addresses per chain
    },
  },
  
  // Ringtail zero-knowledge features
  zkProofs: {
    enabled: true,
    privacyLevel: 'high',
  },
  
  // X-Chain cross-chain features
  crossChain: {
    enabled: true,
    supportedProtocols: ['IBC', 'LayerZero', 'Axelar'],
  },
};