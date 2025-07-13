import { useCallback } from 'react';
import { useAccount, useDisconnect, useNetwork, useSwitchNetwork } from 'wagmi';
import { luxKitModal } from '@onekeyhq/kit-bg/src/connectors/luxkit/example-usage';
import { useLuxWalletFeatures } from './useLuxWalletFeatures';
import { appEventBus, EAppEventBusNames } from '@onekeyhq/shared/src/eventBus/appEventBus';

/**
 * Hook for managing wallet connections with LuxKit
 * Provides a unified interface for wallet operations
 */
export const useWalletConnection = () => {
  const { address, isConnected, connector } = useAccount();
  const { chain } = useNetwork();
  const { switchNetwork } = useSwitchNetwork();
  const { disconnect } = useDisconnect();
  const { features } = useLuxWalletFeatures();

  // Open wallet connection modal
  const openConnectionModal = useCallback((options?: { 
    uri?: string;
    preferLuxKit?: boolean;
  }) => {
    const { uri, preferLuxKit = true } = options || {};

    if (preferLuxKit) {
      // Use LuxKit modal
      if (uri) {
        luxKitModal.open({ view: 'ConnectWallet', walletConnectUri: uri } as any);
      } else {
        luxKitModal.open({ view: 'Connect' });
      }
    } else {
      // Fallback to WalletConnect modal
      appEventBus.emit(EAppEventBusNames.WalletConnectOpenModal, { uri });
    }
  }, []);

  // Close wallet modal
  const closeConnectionModal = useCallback(() => {
    luxKitModal.close();
    appEventBus.emit(EAppEventBusNames.WalletConnectCloseModal);
  }, []);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    disconnect();
    luxKitModal.disconnect();
    closeConnectionModal();
  }, [disconnect, closeConnectionModal]);

  // Switch to a different network
  const switchToNetwork = useCallback((chainId: number) => {
    if (switchNetwork) {
      switchNetwork(chainId);
    } else {
      // If switchNetwork is not available, open modal to network view
      luxKitModal.open({ view: 'Networks' });
    }
  }, [switchNetwork]);

  // Open account view
  const openAccountView = useCallback(() => {
    luxKitModal.open({ view: 'Account' });
  }, []);

  // Get wallet display info
  const getWalletInfo = useCallback(() => {
    if (!connector) return null;

    return {
      name: connector.name,
      address: address || '',
      chainId: chain?.id,
      chainName: chain?.name,
      isLuxWallet: connector.name.toLowerCase().includes('lux'),
      features: features || {
        hasRingtailSignatures: false,
        hasBridgeSupport: false,
        hasCrossChainOperations: false,
      },
    };
  }, [connector, address, chain, features]);

  return {
    // Connection state
    isConnected,
    address,
    chain,
    connector,
    
    // Actions
    openConnectionModal,
    closeConnectionModal,
    disconnectWallet,
    switchToNetwork,
    openAccountView,
    
    // Utilities
    getWalletInfo,
    features,
  };
};