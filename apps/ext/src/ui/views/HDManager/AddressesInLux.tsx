import React from 'react';
import { AccountList, Props as AccountListProps } from './AccountList';
import { SettingData } from './AdvancedSettings';

interface Props extends AccountListProps, SettingData {}

export const AddressesInLux: React.FC<Props> = ({ ...props }) => {
  return <AccountList {...props}></AccountList>;
};
