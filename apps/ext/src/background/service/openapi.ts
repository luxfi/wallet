// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-nocheck
import { INITIAL_OPENAPI_URL, INITIAL_TESTNET_OPENAPI_URL } from '@/constant';
import { OpenApiService } from '@luxfi/lux-api';
import { createPersistStore } from 'background/utils';
export * from '@luxfi/lux-api/dist/types';
import { WebSignApiPlugin } from '@luxfi/lux-api/dist/plugins/web-sign';
import fetchAdapter from '@vespaiach/axios-fetch-adapter';

const testnetStore = new (class TestnetStore {
  store!: { host: string; testnetHost: string };

  constructor() {
    createPersistStore({
      name: 'openapi',
      template: {
        host: INITIAL_OPENAPI_URL,
        testnetHost: INITIAL_TESTNET_OPENAPI_URL,
      },
    }).then((res) => {
      this.store = res;
    });
  }
  get host() {
    return this.store.testnetHost;
  }
  set host(value) {
    this.store.testnetHost = value;
  }
})();

const service = new OpenApiService({
  plugin: WebSignApiPlugin,
  adapter: fetchAdapter,
  store: !process.env.DEBUG
    ? {
        host: INITIAL_OPENAPI_URL,
        testnetHost: INITIAL_TESTNET_OPENAPI_URL,
      }
    : createPersistStore({
        name: 'openapi',
        template: {
          host: INITIAL_OPENAPI_URL,
          testnetHost: INITIAL_TESTNET_OPENAPI_URL,
        },
      }),
});

export const testnetOpenapiService = new OpenApiService({
  plugin: WebSignApiPlugin,
  adapter: fetchAdapter,
  store: !process.env.DEBUG
    ? {
        host: INITIAL_TESTNET_OPENAPI_URL,
        testnetHost: INITIAL_TESTNET_OPENAPI_URL,
      }
    : testnetStore,
});

export default service;
