import { useCallback, useState } from 'react';
import { useAccount, useWalletClient } from 'wagmi';
import { type WalletClient } from 'viem';

interface RingtailSignature {
  signature: string;
  zkProof: string;
  proofType: string;
}

interface BridgeTransferParams {
  fromChain: number;
  toChain: number;
  token: string;
  amount: bigint;
  recipient?: string;
}

interface CrossChainOperation {
  chainId: number;
  target: string;
  data: string;
  value?: bigint;
}

export const useLuxWalletFeatures = () => {
  const { address, connector } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Check if current wallet supports special features
  const getWalletFeatures = useCallback(() => {
    if (!connector) return null;
    
    const walletName = connector.name.toLowerCase();
    
    return {
      hasRingtailSignatures: walletName === 'ringtail' || walletName === 'x-chain',
      hasBridgeSupport: walletName === 'bridge',
      hasCrossChainOperations: walletName === 'x-chain',
    };
  }, [connector]);

  // Ringtail signature for privacy-preserving operations
  const signWithRingtail = useCallback(async (message: string): Promise<RingtailSignature | null> => {
    if (!walletClient || !address) {
      setError(new Error('Wallet not connected'));
      return null;
    }

    const features = getWalletFeatures();
    if (!features?.hasRingtailSignatures) {
      setError(new Error('Current wallet does not support Ringtail signatures'));
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Cast to any to access custom methods
      const client = walletClient as any;
      
      if (typeof client.ringtailSign === 'function') {
        const result = await client.ringtailSign(message, {
          address,
          proofLevel: 'standard',
        });
        
        return result;
      } else {
        // Fallback to regular signature if ringtailSign is not available
        const signature = await walletClient.signMessage({
          account: address,
          message,
        });
        
        return {
          signature,
          zkProof: '',
          proofType: 'standard',
        };
      }
    } catch (err) {
      setError(err as Error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [walletClient, address, getWalletFeatures]);

  // Bridge operations for cross-chain transfers
  const bridgeAssets = useCallback(async (params: BridgeTransferParams): Promise<string | null> => {
    if (!walletClient || !address) {
      setError(new Error('Wallet not connected'));
      return null;
    }

    const features = getWalletFeatures();
    if (!features?.hasBridgeSupport) {
      setError(new Error('Current wallet does not support bridge operations'));
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const client = walletClient as any;
      
      if (typeof client.bridgeTransfer === 'function') {
        const txHash = await client.bridgeTransfer({
          ...params,
          from: address,
          recipient: params.recipient || address,
        });
        
        return txHash;
      } else {
        throw new Error('Bridge transfer method not available');
      }
    } catch (err) {
      setError(err as Error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [walletClient, address, getWalletFeatures]);

  // Cross-chain operation execution
  const executeCrossChainOperation = useCallback(async (operations: CrossChainOperation[]): Promise<string[] | null> => {
    if (!walletClient || !address) {
      setError(new Error('Wallet not connected'));
      return null;
    }

    const features = getWalletFeatures();
    if (!features?.hasCrossChainOperations) {
      setError(new Error('Current wallet does not support cross-chain operations'));
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      const client = walletClient as any;
      
      if (typeof client.executeCrossChain === 'function') {
        const txHashes = await client.executeCrossChain({
          operations,
          from: address,
        });
        
        return txHashes;
      } else {
        throw new Error('Cross-chain execution method not available');
      }
    } catch (err) {
      setError(err as Error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [walletClient, address, getWalletFeatures]);

  return {
    features: getWalletFeatures(),
    signWithRingtail,
    bridgeAssets,
    executeCrossChainOperation,
    isLoading,
    error,
  };
};