// Shared jest environment setup for the Lux Wallet monorepo.
// Provides the browser/runtime globals the RN + web code assumes.

// rtk-query baseQueryFn and viem expect a global fetch.
if (typeof globalThis.fetch === 'undefined') {
  try {
    require('cross-fetch/polyfill')
  } catch {
    // Node 18+ ships a global fetch; nothing to polyfill.
  }
}

// crypto.randomUUID for environments that lack it.
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = require('node:crypto')
} else if (typeof globalThis.crypto.randomUUID !== 'function') {
  globalThis.crypto.randomUUID = require('node:crypto').randomUUID
}

// chrome.* extension APIs used by shared wallet code.
if (typeof global.chrome === 'undefined') {
  global.chrome = {
    storage: {
      local: { set: jest.fn(), get: jest.fn(), remove: jest.fn() },
      session: { set: jest.fn(), get: jest.fn(), remove: jest.fn() },
    },
    runtime: {
      getURL: (path) => `chrome/path/to/${path}`,
      onMessage: { addListener: jest.fn(), removeListener: jest.fn() },
    },
  }
}
