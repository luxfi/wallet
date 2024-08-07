import ImKeyBridge from '@/background/service/keyring/eth-imkey-keyring/imkey-bridge';
import {
  ImKeyAction,
  OffscreenCommunicationTarget,
} from '@/constant/offscreen-communication';
import browser from 'webextension-polyfill';

export function initImKey() {
  const bridge = new ImKeyBridge();

  browser.runtime.onMessage.addListener(
    (
      msg: {
        target: string;
        action: ImKeyAction;
        params: any[];
      },
      _sender,
      sendResponse
    ) => {
      if (msg.target !== OffscreenCommunicationTarget.imkeyOffscreen) {
        return;
      }

      switch (msg.action) {
        case ImKeyAction.unlock:
          bridge
            .unlock()
            .then(sendResponse)
            .catch((err) => {
              // sendResponse({ error: err });
              return new Promise((sendResponse) => {
                setTimeout(() => {
                  sendResponse({ error: err });
                }, 100);
              });
            });
          break;

        case ImKeyAction.cleanUp:
          bridge
            .cleanUp()
            .then(sendResponse)
            .catch((err) => {
              // sendResponse({ error: err });
              return new Promise((sendResponse) => {
                setTimeout(() => {
                  sendResponse({ error: err });
                }, 100);
              });
            });
          break;

        case ImKeyAction.invokeApp:
          bridge
            .invokeApp(...(msg.params as [any, any]))
            .then(sendResponse)
            .catch((err) => {
              // sendResponse({ error: err });
              return new Promise((sendResponse) => {
                setTimeout(() => {
                  sendResponse({ error: err });
                }, 100);
              });
            });
          break;

        default:
          // sendResponse({
          //   success: false,
          //   payload: {
          //     error: 'ImKey action not supported',
          //   },
          // });
          return new Promise((sendResponse) => {
            setTimeout(() => {
              sendResponse({
                success: false,
                payload: { error: 'ImKey action not supported' },
              });
            }, 100);
          });
      }

      // This keeps sendResponse function valid after return
      // https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/runtime/onMessage
      // eslint-disable-next-line consistent-return
      return true;
    }
  );
}
