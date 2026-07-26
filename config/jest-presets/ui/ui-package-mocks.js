// Shared UI-layer jest mocks. Imported by each package's jest-setup.
// Kept conservative: only the RN primitives that have no jsdom/native
// implementation under jest. Package-specific mocks live in each package's
// own jest-package-mocks.

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: jest.fn().mockReturnValue({ top: 0, bottom: 0, left: 0, right: 0 }),
  useSafeAreaFrame: jest.fn().mockReturnValue({ x: 0, y: 0, width: 0, height: 0 }),
  SafeAreaProvider: jest.fn(({ children }) => children),
  SafeAreaView: jest.fn(({ children }) => children),
}))

jest.mock('react-native-webview', () => {
  const { View } = require('react-native')
  return { WebView: View }
})

// Native modules with no jest-usable implementation. Imported at the top of
// each package's jest-setup (before the lux/wallet mocks that pull these in),
// so registering them here makes them active for the whole setup chain.
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter')

jest.mock('react-native-device-info', () =>
  require('react-native-device-info/jest/react-native-device-info-mock'),
)

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
)

jest.mock('@react-native-community/netinfo', () => ({
  ...require('@react-native-community/netinfo/jest/netinfo-mock.js'),
  NetInfoStateType: {
    unknown: 'unknown',
    none: 'none',
    cellular: 'cellular',
    wifi: 'wifi',
    bluetooth: 'bluetooth',
    ethernet: 'ethernet',
    wimax: 'wimax',
    vpn: 'vpn',
    other: 'other',
  },
}))
