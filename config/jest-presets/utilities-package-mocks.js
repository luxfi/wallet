/**
 * Common mocks for the utilities layer. Imported by each package's jest-setup.
 * The published `@l.x/utils` package does not ship its jest mocks, so the
 * shared copy lives here (matches the upstream `utilities/jest-package-mocks`).
 *
 * Notes:
 * * Try not to add test-specific mocks here.
 * * Be wary of import order.
 * * mocks can be overridden per-package.
 */
const util = require('util')

global.TextEncoder = global.TextEncoder ?? util.TextEncoder
global.TextDecoder = global.TextDecoder ?? util.TextDecoder

jest.mock('expo-localization', () => ({
  getLocales: () => [
    {
      languageCode: 'en',
      languageTag: 'en-US',
      regionCode: null,
      currencyCode: null,
      currencySymbol: null,
      decimalSeparator: null,
      digitGroupingSeparator: null,
      textDirection: null,
      measurementSystem: null,
      temperatureUnit: null,
    },
  ],
}))

jest.mock('@datadog/browser-logs', () => ({
  datadogLogs: {
    // intentionally empty — datadog must be inert under test
    logger: {},
  },
}))
