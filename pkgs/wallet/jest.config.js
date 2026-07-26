// this allows us to use es6, es2017, es2018 syntax (const, spread operators outside of array literals, etc.)
/* eslint-env es6, es2017, es2018 */

const preset = require('../../config/jest-presets/jest/jest-preset')

module.exports = {
  ...preset,
  preset: 'jest-expo',
  displayName: 'Wallet Package',
  testTimeout: 15000,
  collectCoverageFrom: [
    'src/**/*.{js,ts,tsx}',
    '!src/**/*.stories.**',
    '!src/abis/**', // auto-generated abis
    '!src/data/__generated__/**', // auto-generated graphql
    '!**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      lines: 0,
    },
  },
  haste: {
    defaultPlatform: 'ios',
    // avoid native because wallet tests assume no .native.ts
    platforms: ['web', 'ios', 'android'],
  },
  // Native-first resolution: `.ios`/`.native` platform splits win over the base
  // file, but `.web` is never consulted (wallet tests run against the native
  // bundle — e.g. moti animations, not the CSS web variants). This is required
  // so platform-split stubs like `@l.x/utils/src/environment/env.ts` resolve to
  // their real `env.native.ts` implementation instead of throwing.
  moduleFileExtensions: [
    'ios.ts',
    'ios.tsx',
    'native.ts',
    'native.tsx',
    'ts',
    'tsx',
    'ios.js',
    'ios.jsx',
    'native.js',
    'native.jsx',
    'js',
    'jsx',
    'json',
    'node',
  ],
  setupFiles: [
    './jest-setup.js',
  ],
  // we map @hanzogui core to its native-test bundle for simpler jest setup
  moduleNameMapper: {
    ...preset.moduleNameMapper,
    '@hanzogui/core': '@hanzogui/core/native-test',
    '@hanzogui/web': '@hanzogui/core/native-test',
    // Map theme animations to native version for tests (base index.ts uses CSS animations now)
    '@l.x/ui/src/theme/animations$': '<rootDir>/../ui/src/theme/animations/index.native.ts',
    // Map platform-specific animation components to native versions for tests
    '@l.x/ui/src/components/factories/animated$': '<rootDir>/../ui/src/components/factories/animated.native.tsx',
    '@l.x/ui/src/components/layout/AnimatedFlex$': '<rootDir>/../ui/src/components/layout/AnimatedFlex.native.tsx',
    '@l.x/ui/src/components/layout/AnimatedScrollView$': '<rootDir>/../ui/src/components/layout/AnimatedScrollView.native.ts',
    '@l.x/ui/src/components/AnimatedFlashList/AnimatedFlashList$': '<rootDir>/../ui/src/components/AnimatedFlashList/AnimatedFlashList.native.tsx',
  },
}
