/* eslint-disable @typescript-eslint/no-unused-vars */
import type { CoreChainApiBase } from '@onekeyhq/core/src/base/CoreChainApiBase';
import type { ISignedMessagePro, ISignedTxPro } from '@onekeyhq/core/src/types';

import { KeyringExternalBase } from '../../base/KeyringExternalBase';

import type { ISignMessageParams, ISignTransactionParams } from '../../types';

export class KeyringExternal extends KeyringExternalBase {
  override coreApi: CoreChainApiBase | undefined;

  override signMessage(params: ISignMessageParams): Promise<ISignedMessagePro> {
    return this.baseSignMessageByExternalWallet(params);
  }

  override signTransaction(
    params: ISignTransactionParams,
  ): Promise<ISignedTxPro> {
    return this.baseSendTransactionByExternalWallet(params);
  }
}
