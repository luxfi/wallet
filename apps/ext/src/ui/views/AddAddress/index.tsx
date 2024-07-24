import React from 'react';
import { AddAddressOptions, BlueHeader } from 'ui/component';
import './style.less';
import { useTranslation } from 'react-i18next';

const AddAddress = () => {
  const { t } = useTranslation();

  return (
    <div className="add-address">
      <BlueHeader
        fixed
        className="mx-[-20px] h-[48px]"
        fillClassName="mb-[20px] h-[48px]"
        style={{ borderBottom: '1px solid #a6a6a6' }}
      >
        {t('page.newAddress.title')}
      </BlueHeader>
      <AddAddressOptions />
    </div>
  );
};

export default AddAddress;
