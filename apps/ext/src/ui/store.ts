import { init } from '@rematch/core';
import { models, RootModel, LuxDispatch, LuxRootState } from './models';
import {
  connect,
  useDispatch,
  useSelector,
  TypedUseSelectorHook,
} from 'react-redux';
import selectPlugin from '@rematch/select';

import onStoreInitialized from './models/_uistore';

const store = init<RootModel>({ models, plugins: [selectPlugin()] });

onStoreInitialized(store);

export type { LuxRootState };

export { connect as connectStore };

export const useLuxDispatch = () => useDispatch<LuxDispatch>();
export const useLuxSelector: TypedUseSelectorHook<LuxRootState> = useSelector;

export function useLuxGetter<Selected = unknown>(
  selector: (
    select: typeof store['select']
  ) => (state: LuxRootState) => Selected
) {
  return useSelector(selector(store.select));
}

export default store;
