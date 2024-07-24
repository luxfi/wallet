import { Item, Popup } from '@/ui/component';
import React, { useMemo } from 'react';
import { ReactComponent as RcImgSortByUsd } from '@/ui/assets/address/sort-by-usd-l.svg';
import { ReactComponent as RcImgSortByType } from '@/ui/assets/address/sort-by-type.svg';
import { ReactComponent as RcImgSortByAlphabet } from '@/ui/assets/address/sort-by-alphabet-2.svg';
import ImgChecked from '@/ui/assets/address/checked.svg';

import { useLuxDispatch, useLuxSelector } from '@/ui/store';
import { AddressSortStore } from '@/background/service/preference';
import { useTranslation } from 'react-i18next';
import { ThemeIconType } from '@/constant';

const AddressSortImgMapping: Record<
  AddressSortStore['sortType'],
  ThemeIconType
> = {
  usd: RcImgSortByUsd,
  addressType: RcImgSortByType,
  alphabet: RcImgSortByAlphabet,
};

export const AddressSortPopup = ({
  open,
  onCancel,
}: {
  open: boolean;
  onCancel: () => void;
}) => {
  const { t } = useTranslation();
  const sortType = useLuxSelector(
    (s) => s.preference.addressSortStore.sortType
  );
  const dispath = useLuxDispatch();
  const handleChange = (value: AddressSortStore['sortType']) => () => {
    dispath.preference.setAddressSortStoreValue({ key: 'sortType', value });
    onCancel?.();
  };

  const arr = useMemo(
    () =>
      [
        {
          key: 'usd',
          label: t('page.manageAddress.sort-by-balance'),
        },
        {
          key: 'addressType',
          label: t('page.manageAddress.sort-by-address-type'),
        },
        {
          key: 'alphabet',
          label: t('page.manageAddress.sort-by-address-note'),
        },
      ] as const,
    []
  );
  return (
    <Popup
      title={
        <span className="relative -top-2">
          {t('page.manageAddress.sort-address')}
        </span>
      }
      closable
      visible={open}
      height={258}
      onCancel={onCancel}
      isSupportDarkMode
    >
      <div className="flex flex-col gap-8">
        {arr.map((e) => (
          <Item
            key={e.key}
            py={13}
            bgColor="var(--l-neutral-card-2, #F2F4F7)"
            leftIcon={AddressSortImgMapping[e.key]}
            onClick={handleChange(e.key)}
            className="text-14 text-l-neutral-title-1 font-normal"
            leftIconClassName="mr-12 w-20 text-l-neutral-title-1"
            rightIcon={ImgChecked}
            rightIconClassName="w-20"
          >
            {e.label}
          </Item>
        ))}
      </div>
    </Popup>
  );
};
