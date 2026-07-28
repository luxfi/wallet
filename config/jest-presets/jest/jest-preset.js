// Jest preset for the Lux Wallet monorepo.
//
// The source was migrated to the published `@l.x/*` + `@luxfi/*` package
// names, but the shared feature code (and the `@l.x/*` packages themselves)
// still import each other by the upstream short names (`lux/…`, `utilities/…`,
// `ui/…`, `wallet/…`, `config/…`). This preset restores those aliases for the
// jest resolver and stubs static assets. The RN transform layer comes from
// `jest-expo`, which each package sets as its `preset`.
const path = require('path')
const globals = require('./globals')

const assetFileMock = path.resolve(__dirname, 'assetFileMock.js')

module.exports = {
  moduleNameMapper: {
    // Static assets → stable stub string.
    '\\.(png|jpg|jpeg|gif|webp|ttf|otf|woff|woff2|mp4|mp3|wav|m4a|lottie)$': assetFileMock,

    // Upstream short-name → published package aliases. Longest / most
    // specific first (jest uses first-match-wins).
    // The published @l.x/utils omits its jest mocks; serve the shared copy.
    '^utilities/jest-package-mocks$': path.resolve(__dirname, '../utilities-package-mocks.js'),
    '^config/jest-presets/(.*)$': path.resolve(__dirname, '../$1'),
    '^utilities/(.*)$': '@l.x/utils/$1',
    '^uniswap/(.*)$': '@l.x/lx/$1',
    '^lux/(.*)$': '@l.x/lx/$1',
    '^lx/(.*)$': '@l.x/lx/$1',
    '^ui/(.*)$': '@l.x/ui/$1',
    // The wallet package lives at pkgs/wallet. This must be an absolute path,
    // not <rootDir>: consumers of this preset have their own rootDir (the
    // extension's is apps/extension), where `wallet/...` resolved to nothing
    // and every suite died in jest-setup before a single test ran.
    '^@luxfi/wallet/(.*)$': path.resolve(__dirname, '../../../pkgs/wallet/$1'),
    '^wallet/(.*)$': path.resolve(__dirname, '../../../pkgs/wallet/$1'),

    // `@luxexchange/*` is the internal scope name the `@l.x/*` packages use to
    // reference each other; alias the whole scope to the published packages.
    '^@luxexchange/(.*)$': '@l.x/$1',
  },
  setupFilesAfterEnv: [path.resolve(__dirname, 'setup.js')],
  // The RN surface is the @hanzogui fork; jest-expo's default ignore list only
  // whitelists upstream `react-native`. Let the Flow-typed fork packages + the
  // ESM-only deps through babel so the expo preset can strip their types.
  //
  // pnpm flattens scoped packages to `.pnpm/@scope+name@ver/…`, so the classic
  // `@scope/name/`-anchored whitelist never matches the virtual store. Match at
  // scope level and allow the pnpm separators (`+`, `@`) as well as `/`.
  transformIgnorePatterns: [
    'node_modules/(?!(?:\\.pnpm/)?(?:@hanzogui|@react-native|@react-navigation|@shopify|@gorhom|@l\\.x|@luxfi|@noble|@scure|@walletconnect|@statsig|@solana|react-native[a-z-]*|expo[a-z-]*|moti|nanoid|uuid|viem|wagmi|redux-persist)[-+@/])',
  ],
  clearMocks: true,
  ...globals,
}
