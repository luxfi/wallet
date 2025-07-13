import { describe, it, expect } from '@jest/globals';
import { createModal, getDefaultConfig } from 'luxkit';
import { createConfig } from '@wagmi/core';
import { mainnet } from '@wagmi/core/chains';

describe('LuxKit Integration', () => {
  it('should create a modal instance', () => {
    const config = createConfig({
      chains: [mainnet],
      transports: {
        [mainnet.id]: () => ({ 
          request: async () => null 
        } as any),
      },
    });

    const modal = createModal({
      wagmi: config,
      appInfo: {
        name: 'Test App',
        description: 'Test Description',
      },
    });

    expect(modal).toBeDefined();
    expect(modal.open).toBeInstanceOf(Function);
    expect(modal.close).toBeInstanceOf(Function);
    expect(modal.subscribeState).toBeInstanceOf(Function);
    expect(modal.getState).toBeInstanceOf(Function);
  });

  it('should have correct default config', () => {
    const defaultConfig = getDefaultConfig({
      appName: 'Test App',
      projectId: 'test-project-id',
    });

    expect(defaultConfig).toBeDefined();
    expect(defaultConfig.transports).toBeDefined();
  });

  it('should support custom chain configuration', () => {
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
    };

    const config = createConfig({
      chains: [luxChain as any],
      transports: {
        [luxChain.id]: () => ({ 
          request: async () => null 
        } as any),
      },
    });

    expect(config).toBeDefined();
    expect(config.chains).toContain(expect.objectContaining({ id: 7777777 }));
  });
});