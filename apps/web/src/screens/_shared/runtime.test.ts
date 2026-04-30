/**
 * Smoke import test — verifies all screen module entrypoints compile and
 * type-check together. Run via `tsc --noEmit`.
 *
 * No runtime test framework is wired up in apps/web yet; we keep this as
 * a typed import probe that the build pipeline will catch.
 */

import * as stake from "../stake"
import * as dapps from "../dapps"
import * as runtime from "./runtime"
import * as account from "./account"

const _probes: Array<unknown> = [
  stake.Stake,
  stake.StakeForm,
  stake.ValidatorList,
  stake.useValidators,
  stake.useStake,
  stake.default, // StakeRoutes
  dapps.DApps,
  dapps.Connect,
  dapps.ActiveSessions,
  dapps.useWalletConnect,
  dapps.useTrustedDApps,
  dapps.default, // DAppsRoutes
  runtime.loadRuntimeConfig,
  runtime.pchainRpc,
  account.useAccount,
  account.getAccount,
]

void _probes
