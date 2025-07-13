import React, { useEffect, useState } from 'react';
import { useAccount, useNetwork, useDisconnect } from 'wagmi';
import { luxKitModal, wagmiConfig } from '@onekeyhq/kit-bg/src/connectors/luxkit/example-usage';

interface LuxKitModalProps {
  onConnect?: (address: string) => void;
  onDisconnect?: () => void;
}

export const LuxKitModal: React.FC<LuxKitModalProps> = ({ onConnect, onDisconnect }) => {
  const { address, isConnected } = useAccount();
  const { chain } = useNetwork();
  const { disconnect } = useDisconnect();
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    // Subscribe to modal state changes
    const unsubscribe = luxKitModal.subscribeState((state) => {
      setIsModalOpen(state.open);
      
      if (state.isConnected && state.address && onConnect) {
        onConnect(state.address);
      }
    });

    return () => {
      unsubscribe();
    };
  }, [onConnect]);

  const handleConnect = () => {
    luxKitModal.open();
  };

  const handleDisconnect = () => {
    disconnect();
    luxKitModal.disconnect();
    if (onDisconnect) {
      onDisconnect();
    }
  };

  const handleSwitchNetwork = () => {
    luxKitModal.open({ view: 'Networks' });
  };

  const handleViewAccount = () => {
    luxKitModal.open({ view: 'Account' });
  };

  if (!isConnected) {
    return (
      <button
        onClick={handleConnect}
        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
      >
        Connect Wallet
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col items-end">
        <span className="text-sm text-gray-500">Connected to</span>
        <span className="text-sm font-medium">{chain?.name || 'Unknown'}</span>
      </div>
      
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <div className="w-2 h-2 bg-green-500 rounded-full" />
        <span className="text-sm font-mono">
          {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''}
        </span>
      </div>

      <div className="flex gap-1">
        <button
          onClick={handleViewAccount}
          className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          title="View Account"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </button>
        
        <button
          onClick={handleSwitchNetwork}
          className="p-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          title="Switch Network"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </button>
        
        <button
          onClick={handleDisconnect}
          className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
          title="Disconnect"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </div>
  );
};

// Hook for using LuxKit modal programmatically
export const useLuxKitModal = () => {
  const [state, setState] = useState(luxKitModal.getState());

  useEffect(() => {
    const unsubscribe = luxKitModal.subscribeState(setState);
    return unsubscribe;
  }, []);

  return {
    open: luxKitModal.open,
    close: luxKitModal.close,
    state,
  };
};