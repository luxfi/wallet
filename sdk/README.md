# Lux Wallet SDK (Beta)

Lux Wallet SDK is a Typescript library for creating and managing decentralized wallets.

It provides high level methods to transact on Lux's primary networks: X, P and C chain.

Wallet types supported:

-   Singleton Wallets
-   Ledger Wallets
-   Mnemonic Wallets
-   Public Mnemonic Wallets (XPUB)

Using the luxnet-wallet-sdk developers can:

-   Receive and send tokens and NFTs.
-   Cross chain transfer
-   Validation & Delegation
-   Create keystore files from wallet instances
-   Get transaction history of wallets
-   Mint NFTs on the X chain

## Installation

With npm

`npm install --save @luxfi/wallet-sdk`

or pnpm

`pnpm add @luxfi/wallet-sdk`

## Local build

1. Clone the repository.
2. Install dependencies `pnpm install`
3. Run for development `pnpm start`

## Webpack

For Webpack version 5 and above you must use this plugin with it. https://www.npmjs.com/package/node-polyfill-webpack-plugin

## Docs

Can generate documentation with `pnpm docs` and open `docs/index.html` in a browser.
