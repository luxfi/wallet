import { PendingTxItem } from '@luxfi/lux-api/dist/types';
import React from 'react';
import { getActionTypeTextByType } from '../../../Approval/components/Actions/utils';

export const TransactionActionType = ({ data }: { data: PendingTxItem }) => {
  return (
    <div className="text-l-neutral-title-1 font-medium">
      {getActionTypeTextByType(data.action_type)}
    </div>
  );
};
