// Deterministic timezone + APP_ID so config schema validation passes under jest.
process.env.TZ = process.env.TZ ?? 'America/New_York'
process.env.APP_ID = process.env.APP_ID ?? 'web'

module.exports = {
  globals: {
    ALCHEMY_API_KEY: 'key',
    AMPLITUDE_PROXY_URL_OVERRIDE: '',
    API_BASE_URL_OVERRIDE: '',
    API_BASE_URL_V2_OVERRIDE: '',
    APPSFLYER_API_KEY: 'key',
    APPSFLYER_APP_ID: 123,
    DATADOG_CLIENT_TOKEN: 'key',
    DATADOG_PROJECT_ID: 123,
    INFURA_KEY: 'key',
    ONESIGNAL_APP_ID: 'key',
    STATSIG_API_KEY: 'key',
    STATSIG_PROXY_URL_OVERRIDE: '',
    TRADING_API_KEY: 'key',
    TRADING_API_URL_OVERRIDE: '',
    WALLETCONNECT_PROJECT_ID: 'key',
    QUICKNODE_ENDPOINT_NAME: '',
    QUICKNODE_ENDPOINT_TOKEN: '',
    UNITAGS_API_URL_OVERRIDE: '',
  },
}
