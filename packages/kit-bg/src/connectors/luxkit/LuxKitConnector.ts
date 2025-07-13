import { IExternalWalletController } from '../IExternalWalletController';
import { EVMDecodedItem, EVMDecodedTxType } from '@luxfi/hd-core';
import { setupLuxKitProvider, getConnectedAccount } from './LuxKitProvider';
import type { SendTransactionParameters } from '@wagmi/core';

export class LuxKitConnector implements IExternalWalletController {
  private provider: any;
  private walletInfo: any;

  constructor() {
    const { wagmiConfig } = setupLuxKitProvider();
    this.provider = wagmiConfig;
  }

  async connect(): Promise<string[]> {
    try {
      const walletInfo = await getConnectedAccount();
      if (!walletInfo || !walletInfo.address) {
        throw new Error('No wallet connected');
      }
      
      this.walletInfo = walletInfo;
      return [walletInfo.address];
    } catch (error) {
      console.error('LuxKit connection error:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.provider.connector) {
      await this.provider.connector.disconnect();
    }
    this.walletInfo = null;
  }

  async getAccounts(): Promise<string[]> {
    const walletInfo = await getConnectedAccount();
    return walletInfo ? [walletInfo.address] : [];
  }

  async signMessage(message: string): Promise<string> {
    if (!this.walletInfo) {
      throw new Error('Wallet not connected');
    }

    const { connector } = this.provider;
    if (!connector || !connector.signMessage) {
      throw new Error('Signing not supported');
    }

    return await connector.signMessage({ message });
  }

  async signTypedData(typedData: any): Promise<string> {
    if (!this.walletInfo) {
      throw new Error('Wallet not connected');
    }

    const { connector } = this.provider;
    if (!connector || !connector.signTypedData) {
      throw new Error('Typed data signing not supported');
    }

    return await connector.signTypedData(typedData);
  }

  async sendTransaction(params: SendTransactionParameters): Promise<string> {
    if (!this.walletInfo) {
      throw new Error('Wallet not connected');
    }

    const { connector } = this.provider;
    if (!connector || !connector.sendTransaction) {
      throw new Error('Transaction sending not supported');
    }

    const hash = await connector.sendTransaction(params);
    return hash;
  }

  async switchChain(chainId: number): Promise<void> {
    if (!this.walletInfo) {
      throw new Error('Wallet not connected');
    }

    const { connector } = this.provider;
    if (!connector || !connector.switchChain) {
      throw new Error('Chain switching not supported');
    }

    await connector.switchChain({ chainId });
  }

  async isConnected(): Promise<boolean> {
    const walletInfo = await getConnectedAccount();
    return !!walletInfo;
  }

  async getChainId(): Promise<number> {
    const walletInfo = await getConnectedAccount();
    return walletInfo?.chainId || 1;
  }

  // Bridge wallet specific features
  async bridgeTokens(params: {
    fromChain: number;
    toChain: number;
    token: string;
    amount: string;
    recipient?: string;
  }): Promise<string> {
    // Implementation for bridge functionality
    // This would integrate with the Lux Bridge protocol
    throw new Error('Bridge functionality not yet implemented');
  }

  // Ringtail wallet specific features (zero-knowledge proofs)
  async generateZKProof(data: any): Promise<any> {
    // Implementation for ZK proof generation
    // This would integrate with Ringtail's privacy features
    throw new Error('ZK proof functionality not yet implemented');
  }

  // X-Chain specific features (cross-chain operations)
  async executeXChainTransaction(params: {
    chains: number[];
    operations: any[];
  }): Promise<string[]> {
    // Implementation for cross-chain transaction execution
    // This would integrate with X-Chain protocol
    throw new Error('X-Chain functionality not yet implemented');
  }
}

// Factory function to create LuxKit connector
export function createLuxKitConnector(): LuxKitConnector {
  return new LuxKitConnector();
}