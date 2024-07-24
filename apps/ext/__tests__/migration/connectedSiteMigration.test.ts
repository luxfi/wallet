/**
 * @jest-environment jsdom
 */
import { PermissionStore } from 'background/service/permission';
import { CHAINS_ENUM } from 'consts';
import connectedSiteMigration from '@/migrations/connectedSiteMigration';

const data = {
  permission: {
    dumpCache: [
      {
        e: 0,
        k: 'https://lux.link',
        v: {
          chain: 'BSC' as CHAINS_ENUM,
          icon: '',
          isSigned: false,
          isTop: false,
          name: 'lux',
          origin: 'https://lux.link',
        },
      },
      {
        e: 0,
        k: 'https://uniswap.com',
        v: {
          chain: 'FTM' as CHAINS_ENUM,
          icon: '',
          isSigned: false,
          isTop: false,
          name: 'lux',
          origin: 'https://lux.link',
          isConnected: false,
        },
      },
      {
        e: 0,
        k: 'https://lux.link',
        v: {
          chain: 'ETH' as CHAINS_ENUM,
          icon: '',
          isSigned: false,
          isTop: false,
          name: 'lux',
          origin: 'https://lux.link',
          isConnected: true,
        },
      },
    ],
  },
} as { permission: PermissionStore };

test('should migrate data', () => {
  return connectedSiteMigration.migrator(data).then((result) => {
    expect(result!.permission!.dumpCache).toEqual([
      {
        e: 0,
        k: 'https://lux.link',
        v: {
          chain: 'BSC' as CHAINS_ENUM,
          icon: '',
          isSigned: false,
          isTop: false,
          name: 'lux',
          origin: 'https://lux.link',
          isConnected: true,
        },
      },
      {
        e: 0,
        k: 'https://uniswap.com',
        v: {
          chain: 'FTM' as CHAINS_ENUM,
          icon: '',
          isSigned: false,
          isTop: false,
          name: 'lux',
          origin: 'https://lux.link',
          isConnected: false,
        },
      },
      {
        e: 0,
        k: 'https://lux.link.com',
        v: {
          chain: 'ETH' as CHAINS_ENUM,
          icon: '',
          isSigned: false,
          isTop: false,
          name: 'lux',
          origin: 'https://lux.link',
          isConnected: true,
        },
      },
    ]);
  });
});

test('return undefined for new user', () => {
  connectedSiteMigration
    .migrator({ permission: undefined })
    .then((result) => expect(result).toBeUndefined());
});
