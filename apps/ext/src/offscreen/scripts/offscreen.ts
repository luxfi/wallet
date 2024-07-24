import { initBitBox02 } from './bitbox02';
import { initImKey } from './imkey';
import initLattice from './lattice';
import { initOneKey } from './onekey';
import browser from 'webextension-polyfill';

initImKey();
initOneKey();
initBitBox02();
initLattice();

setInterval(() => {
  browser.runtime.sendMessage({ type: 'ping' });
}, 20000);
