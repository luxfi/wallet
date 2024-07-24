import { LuxRootState, LuxDispatch } from '@/ui/models';
import { onBackgroundStoreChanged } from '../utils/broadcastToUI';

export default (store: typeof import('@/ui/store').default) => {
  const dispatch = store.dispatch as LuxDispatch;

  onBackgroundStoreChanged('contactBook', (payload) => {
    const state = store.getState() as LuxRootState;
    const currentAccount = state.account.currentAccount;
    const currentAddr = currentAccount?.address;

    if (currentAddr && payload.partials[currentAddr]) {
      const aliasName = payload.partials[currentAddr]!.name;
      currentAccount.alianName = aliasName;
      dispatch.account.setField({
        alianName: aliasName,
        currentAccount: { ...currentAccount },
      });
    }
  });

  onBackgroundStoreChanged('preference', (payload) => {
    // const state = store.getState() as LuxRootState;
    // const preference = state.preference;

    switch (payload.changedKey) {
      case 'themeMode': {
        dispatch.preference.setField({
          themeMode: payload.partials.themeMode,
        });
        break;
      }
      // case 'curvePointsMap': {
      //   dispatch.account.setField({
      //     curvePointsMap: payload.partials.curvePointsMap,
      //   })
      //   break;
      // }
    }
  });

  onBackgroundStoreChanged('whitelist', (payload) => {
    switch (payload.changedKey) {
      case 'whitelists': {
        dispatch.whitelist.setField({
          whitelist: payload.partials.whitelists,
        });
        break;
      }
      case 'enabled': {
        dispatch.whitelist.setField({
          enabled: payload.partials.enabled,
        });
        break;
      }
    }
  });
};
