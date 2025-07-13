import { useEffect } from 'react';
import { Page } from '@onekeyhq/components';
import platformEnv from '@onekeyhq/shared/src/platformEnv';
import type { IAppEventBusPayload } from '@onekeyhq/shared/src/eventBus/appEventBus';
import {
  EAppEventBusNames,
  appEventBus,
} from '@onekeyhq/shared/src/eventBus/appEventBus';
import { luxKitModal } from '@onekeyhq/kit-bg/src/connectors/luxkit/example-usage';

/**
 * Global container for LuxKit modal
 * Handles wallet connection events and modal state
 */
export function GlobalLuxKitModalContainer() {
  useEffect(() => {
    // Handle open modal events
    const handleOpenModal = async (
      payload: IAppEventBusPayload[EAppEventBusNames.WalletConnectOpenModal],
    ) => {
      const { uri } = payload;
      
      console.log('LuxKit: Opening modal with URI:', uri);
      
      // Open LuxKit modal
      if (uri) {
        // If we have a WalletConnect URI, open in WalletConnect view
        luxKitModal.open({ 
          view: 'ConnectWallet',
          walletConnectUri: uri 
        } as any);
      } else {
        // Otherwise open normal connect view
        luxKitModal.open({ view: 'Connect' });
      }
    };

    // Handle close modal events
    const handleCloseModal = async () => {
      console.log('LuxKit: Closing modal');
      luxKitModal.close();
    };

    // Subscribe to modal state changes
    const unsubscribe = luxKitModal.subscribeState((state) => {
      console.log('LuxKit state changed:', state);
      
      // Emit events when connection state changes
      if (state.isConnected && state.address) {
        appEventBus.emit(EAppEventBusNames.WalletConnected, {
          address: state.address,
          chainId: state.selectedNetworkId,
          connector: 'luxkit',
        });
      }
    });

    // Listen to app event bus
    appEventBus.on(EAppEventBusNames.WalletConnectOpenModal, handleOpenModal);
    appEventBus.on(EAppEventBusNames.WalletConnectCloseModal, handleCloseModal);

    return () => {
      unsubscribe();
      appEventBus.off(EAppEventBusNames.WalletConnectOpenModal, handleOpenModal);
      appEventBus.off(EAppEventBusNames.WalletConnectCloseModal, handleCloseModal);
    };
  }, []);

  // LuxKit handles its own modal rendering, so we don't need to return JSX
  return null;
}

// Wrapper component that handles platform-specific rendering
export function GlobalLuxKitModalContainerWrapper() {
  return platformEnv.isNativeIOS ? (
    <Page.Every>
      <GlobalLuxKitModalContainer />
    </Page.Every>
  ) : (
    <GlobalLuxKitModalContainer />
  );
}