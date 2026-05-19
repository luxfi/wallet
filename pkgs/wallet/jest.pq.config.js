// Minimal Jest config for the pure-TS pkgs/wallet/src/features/wallet/pq
// subtree. Bypasses the upstream-shaped jest-expo preset (which depends
// on a missing config/jest-presets dir, see LLM.md) so the PQ tests can
// run in isolation. No React Native deps — pure crypto over noble.

const path = require('path')

// pnpm hoists @noble/* to versioned virtual paths; the canonical
// resolution points (node_modules/@noble/...) are the symlinks the
// workspace consumes. For jest we map directly to the .pnpm store so
// the resolver doesn't need to evaluate conditional exports.
const workspace = path.resolve(__dirname, '../..')
const pqStore = `${workspace}/node_modules/.pnpm/@noble+post-quantum@0.6.1/node_modules`

module.exports = {
  rootDir: 'src/features/wallet/pq',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/*.test.ts'],
  transform: {
    '^.+\\.[tj]sx?$': [
      'babel-jest',
      {
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' } }],
          '@babel/preset-typescript',
        ],
      },
    ],
  },
  moduleNameMapper: {
    // @noble/post-quantum is ESM-only; route its sub-entries through
    // physical .js paths in its pnpm-virtual node_modules.
    '^@noble/post-quantum/ml-dsa(\\.js)?$':
      `${pqStore}/@noble/post-quantum/ml-dsa.js`,
    '^@noble/post-quantum/ml-kem(\\.js)?$':
      `${pqStore}/@noble/post-quantum/ml-kem.js`,
    '^@noble/post-quantum/slh-dsa(\\.js)?$':
      `${pqStore}/@noble/post-quantum/slh-dsa.js`,
    '^@noble/post-quantum/utils(\\.js)?$':
      `${pqStore}/@noble/post-quantum/utils.js`,
    '^@noble/post-quantum/_crystals(\\.js)?$':
      `${pqStore}/@noble/post-quantum/_crystals.js`,
    // post-quantum internals reference `@noble/X/Y.js` with .js
    // extensions; route those through the pq pnpm-virtual store so
    // post-quantum gets its peer-pinned (curves 2.2.0, hashes 2.2.0,
    // ciphers 2.2.0). Imports WITHOUT .js (e.g. bip32's
    // `@noble/curves/secp256k1`) keep normal resolution and find their
    // own peer-pinned versions — bip32 1.3.2 needs curves 1.x.
    '^@noble/curves/(.+?)\\.js$':
      `${pqStore}/@noble/curves/$1.js`,
    '^@noble/hashes/(.+?)\\.js$':
      `${pqStore}/@noble/hashes/$1.js`,
    '^@noble/ciphers/(.+?)\\.js$':
      `${pqStore}/@noble/ciphers/$1.js`,
  },
  // @noble/post-quantum ships as native ESM; let babel-jest transform it.
  // pnpm stores packages under `node_modules/.pnpm/<scope>+<name>@<ver>/...`
  // The ignore pattern must let *all* @noble and @scure paths through —
  // whether they appear under the surface `node_modules/@noble/...` or
  // deeper at `node_modules/.pnpm/@noble+...`.
  transformIgnorePatterns: [
    '/node_modules/(?!(\\.pnpm/@(noble|scure)\\+|@noble|@scure))',
  ],
  // ML-DSA-65 sign is ~50ms; SLH-DSA-192f sign is ~200ms in JS. Default 5s is tight.
  testTimeout: 120000,
}
