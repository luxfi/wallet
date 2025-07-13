/**
 * Wallet configuration for enabling/disabling features
 * This includes LuxKit integration settings
 */

export const walletConfig = {
  // Enable LuxKit modal for wallet connections
  enableLuxKit: true,
  
  // Prefer LuxKit over WalletConnect for new connections
  preferLuxKit: true,
  
  // Show both LuxKit and WalletConnect options
  showMultipleConnectionOptions: false,
  
  // Supported wallet types in LuxKit
  luxKitWallets: {
    lux: true,
    bridge: true,
    ringtail: true,
    xchain: true,
    rabby: true,
    metamask: true,
    coinbase: true,
    walletconnect: true,
  },
  
  // Special features configuration
  specialFeatures: {
    enableRingtailSignatures: true,
    enableBridgeOperations: true,
    enableCrossChainOperations: true,
  },
  
  // Chain configuration
  supportedChains: {
    luxNetwork: {
      id: 7777777,
      name: 'Lux Network',
      enabled: true,
    },
    ethereum: {
      id: 1,
      name: 'Ethereum',
      enabled: true,
    },
    bsc: {
      id: 56,
      name: 'BSC',
      enabled: true,
    },
    polygon: {
      id: 137,
      name: 'Polygon',
      enabled: true,
    },
    avalanche: {
      id: 43114,
      name: 'Avalanche',
      enabled: true,
    },
  },
  
  // UI configuration
  ui: {
    theme: 'dark' as const,
    accentColor: '#6B46C1',
    showWalletFeatures: true,
    compactMode: false,
  },
  
  // Development settings
  development: {
    logLuxKitEvents: process.env.NODE_ENV === 'development',
    showDebugInfo: process.env.NODE_ENV === 'development',
  },
};

export type WalletConfig = typeof walletConfig;