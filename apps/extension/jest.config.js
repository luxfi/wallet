const preset = require('../../config/jest-presets/jest/jest-preset')

const fileExtensions = ['eot', 'gif', 'jpeg', 'jpg', 'otf', 'png', 'ttf', 'woff', 'woff2', 'mp4']

// The shared preset exports only moduleNameMapper, setupFilesAfterEach,
// transformIgnorePatterns, clearMocks and globals. Spreading the two keys it
// does NOT export threw `preset.moduleFileExtensions is not iterable` at config
// load, so every test in this package was unrunnable. Jest's own defaults are
// what the preset was assumed to be contributing, so state them here.
const baseFileExtensions = ['js', 'mjs', 'cjs', 'jsx', 'ts', 'mts', 'cts', 'tsx', 'json', 'node']

module.exports = {
  ...preset,
  preset: 'jest-expo',
  transform: {
    '^.+\\.(t|j)sx?$': [
      'babel-jest',
      {
        configFile: './src/test/babel.config.js',
      },
    ],
  },
  moduleNameMapper: {
    ...preset.moduleNameMapper,
    '^react-native$': 'react-native-web',
  },
  moduleFileExtensions: ['web.js', 'web.jsx', 'web.ts', 'web.tsx', ...fileExtensions, ...baseFileExtensions],
  resolver: '<rootDir>/src/test/jest-resolver.js',
  displayName: 'Extension Wallet',
  testMatch: ['<rootDir>/src/**/*.(spec|test).[jt]s?(x)', '<rootDir>/config/**/*.(spec|test).[jt]s?(x)'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/e2e/'],
  collectCoverageFrom: [
    'src/app/**/*.{js,ts,tsx}',
    'src/background/**/*.{js,ts,tsx}',
    'src/contentScript/**/*.{js,ts,tsx}',
    'config/**/*.{js,ts,tsx}',
    '!src/**/*.stories.**',
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      lines: 0,
    },
  },
  setupFiles: ['../../config/jest-presets/jest/setup.js', './jest-setup.js'],
}
