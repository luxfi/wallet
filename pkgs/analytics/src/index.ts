/**
 * Provider-pluggable analytics for the Lux Wallet.
 *
 * Pattern matches `~/work/lux/exchange/pkgs/utilities/src/telemetry/analytics/backend.ts`.
 * No third-party SDK is loaded by this module. Delivery is owned by an
 * `AnalyticsDriver` registered via `setAnalyticsDriver(...)`.
 *
 * Default wiring (when wallet apps are integrated):
 *   - Web/extension → Hanzo Insights (PostHog wire protocol; configurable host).
 *   - Mobile → Hanzo Insights via the same driver shape.
 *   - White-labels override via `setAnalyticsDriver(...)` at app boot.
 *
 * Public surface (`init`/`track`/`identify`/`Identify`/`getUserId`/...) matches
 * the existing wallet call sites so swapping providers requires no diff to
 * `sendAnalyticsEvent(...)` consumers.
 */

export interface AnalyticsDriver {
  /** Send an event with optional properties. */
  capture(eventName: string, properties?: Record<string, unknown>): void
  /** Associate the current session with a user id and optional traits. */
  identify?(userId: string, properties?: Record<string, unknown>): void
  /** Merge user-level properties (`Identify().set(...)`). */
  setUserProperties?(properties: Record<string, unknown>): void
  /** Hint the driver to flush queued events. */
  flush?(): void | Promise<void>
  /** Reset session — clears user id, device id, person properties. */
  reset?(): void
}

let driver: AnalyticsDriver | null = null
let userIdCache: string | undefined
let deviceIdCache: string | undefined
const userProps: Record<string, unknown> = {}

export function setAnalyticsDriver(d: AnalyticsDriver | null): void {
  driver = d
}

export function getAnalyticsDriver(): AnalyticsDriver | null {
  return driver
}

export type InitOptions = {
  transportProvider?: unknown
  trackingOptions?: unknown
  [key: string]: unknown
}

export function init(_apiKey: string, initialUserId?: string, _opts?: InitOptions): void {
  if (initialUserId) {
    userIdCache = initialUserId
  }
}

export function track(eventName: string, properties?: Record<string, unknown>): void {
  driver?.capture(eventName, properties)
}

export function flush(): void {
  void driver?.flush?.()
}

export function getUserId(): string | undefined {
  return userIdCache
}

export function setUserId(id: string | undefined): void {
  userIdCache = id
  if (id) {
    driver?.identify?.(id, { ...userProps })
  }
}

export function setDeviceId(id: string): void {
  deviceIdCache = id
  driver?.setUserProperties?.({ device_id: id })
}

export function getDeviceId(): string | undefined {
  return deviceIdCache
}

export function reset(): void {
  userIdCache = undefined
  deviceIdCache = undefined
  Object.keys(userProps).forEach((k) => {
    delete userProps[k]
  })
  driver?.reset?.()
}

/**
 * Operations builder for user-property merges. Matches the existing
 * `Identify` API the wallet uses against legacy providers — call sites
 * don't change when the driver is swapped.
 */
export class Identify {
  private ops: Array<() => void> = []

  set(property: string, value: unknown): this {
    this.ops.push(() => {
      userProps[property] = value
    })
    return this
  }

  setOnce(property: string, value: unknown): this {
    this.ops.push(() => {
      if (!(property in userProps)) {
        userProps[property] = value
      }
    })
    return this
  }

  postInsert(property: string, value: unknown): this {
    this.ops.push(() => {
      const current = userProps[property]
      userProps[property] = Array.isArray(current) ? [...current, value] : [value]
    })
    return this
  }

  unset(property: string): this {
    this.ops.push(() => {
      delete userProps[property]
    })
    return this
  }

  clearAll(): this {
    this.ops.push(() => {
      Object.keys(userProps).forEach((k) => {
        delete userProps[k]
      })
    })
    return this
  }

  /** @internal — applied by `identify(builder)`. */
  apply(): Record<string, unknown> {
    this.ops.forEach((op) => op())
    this.ops = []
    return userProps
  }
}

export function identify(i: Identify): void {
  const merged = i.apply()
  driver?.setUserProperties?.({ ...merged })
}
