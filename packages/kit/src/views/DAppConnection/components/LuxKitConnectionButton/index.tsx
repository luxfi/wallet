import React, { useCallback } from 'react';
import { Button } from '@onekeyhq/components';
import { useWalletConnection } from '../../../../hooks/useWalletConnection';
import { useIntl } from 'react-intl';
import { ETranslations } from '@onekeyhq/shared/src/locale';

interface LuxKitConnectionButtonProps {
  onConnect?: (address: string) => void;
  onDisconnect?: () => void;
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

/**
 * Connection button component using LuxKit
 * Provides a unified interface for DApp connections
 */
export const LuxKitConnectionButton: React.FC<LuxKitConnectionButtonProps> = ({
  onConnect,
  onDisconnect,
  className,
  size = 'medium',
}) => {
  const intl = useIntl();
  const {
    isConnected,
    address,
    openConnectionModal,
    disconnectWallet,
    getWalletInfo,
  } = useWalletConnection();

  const handleClick = useCallback(() => {
    if (isConnected) {
      disconnectWallet();
      onDisconnect?.();
    } else {
      openConnectionModal({ preferLuxKit: true });
    }
  }, [isConnected, disconnectWallet, openConnectionModal, onDisconnect]);

  React.useEffect(() => {
    if (isConnected && address && onConnect) {
      onConnect(address);
    }
  }, [isConnected, address, onConnect]);

  const walletInfo = getWalletInfo();
  
  const buttonText = React.useMemo(() => {
    if (isConnected && walletInfo) {
      const shortAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';
      return `${walletInfo.name} (${shortAddress})`;
    }
    return intl.formatMessage({ id: ETranslations.global_connect_wallet });
  }, [isConnected, walletInfo, address, intl]);

  const buttonVariant = isConnected ? 'secondary' : 'primary';

  return (
    <Button
      variant={buttonVariant}
      size={size}
      onPress={handleClick}
      className={className}
    >
      {buttonText}
    </Button>
  );
};