import { AddressViewer, Copy, PageHeader } from '@/ui/component';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { UseSeedPhrase } from './hooks';
import ThemeIcon from '@/ui/component/ThemeMode/ThemeIcon';
import { useWalletConnectIcon } from '@/ui/component/WalletConnect/useWalletConnectIcon';
import { formatUsdValue } from '@/ui/utils';
import { Button } from 'antd';
import { DisplayedAccount, TypeKeyringGroup } from '../ManageAddress/hooks';
import { pickKeyringThemeIcon } from '@/utils/account';
import { KEYRING_ICONS, WALLET_BRAND_CONTENT } from '@/constant';
import { useThemeMode } from '@/ui/hooks/usePreference';
import { ReactComponent as IconAdd } from '@/ui/assets/address/add.svg';
import clsx from 'clsx';

export const AddFromCurrentSeedPhrase = () => {
  const { t } = useTranslation();
  const { handleAddSeedPhraseAddress, seedPhraseList } = UseSeedPhrase();

  return (
    <div className="flex flex-col min-h-full bg-l-neutral-bg-2 px-20 ">
      <PageHeader className="pt-[20px]" fixed>
        {t('page.newAddress.addFromCurrentSeedPhrase')}
      </PageHeader>
      <div className="flex-1 flex flex-col space-y-[20px] pb-[20px]">
        {seedPhraseList?.map((item, index) => (
          <Group data={item} index={index} onAdd={handleAddSeedPhraseAddress} />
        ))}
      </div>
    </div>
  );
};

const Group = ({
  data,
  index,
  onAdd,
}: {
  data: TypeKeyringGroup;
  index: number;
  onAdd: (p: string) => void;
}) => {
  const { t } = useTranslation();
  return (
    <div className="relative w-full p-[16px] bg-l-neutral-card-1 overflow-hidden rounded-[6px] pt-0">
      <div className="h-[48px] flex items-center mb-14 text-l-neutral-title1 text-[15px] font-medium">
        Seed Phrase {index + 1}
      </div>
      <div className="absolute left-0 top-[48px] w-full h-0 border-b-[0.5px] border-lux-neutral-line" />

      <div className="space-y-[20px]">
        {data.list.map((e) => (
          <Item key={e.address} item={e} />
        ))}
      </div>

      <Button
        onClick={() => onAdd(data.publicKey!)}
        type="primary"
        className={clsx(
          'bg-white w-full shadow-none h-[40px] border-transparent hover:bg-[#dddddd] hover:before:hidden',
          data.list.length ? 'mt-[20px]' : 'mt-[6px]'
        )}
      >
        <div className="flex items-center justify-center space-x-6 text-l-blue-default">
          <IconAdd />
          <span
            className="text-[13px] font-medium text-[#000]"
            style={{
              textShadow: 'none',
              paddingTop: '2px',
            }}
          >
            {t('page.manageAddress.add-address')}
          </span>
        </div>
      </Button>
    </div>
  );
};

const Item = ({ item }: { item: DisplayedAccount }) => {
  const { address, brandName, type, alianName, balance } = item;
  const brandIcon =
    useWalletConnectIcon(
      address && brandName
        ? {
            address,
            brandName,
            type,
          }
        : null
    ) || '';

  const { isDarkTheme } = useThemeMode();

  const addressTypeIcon = useMemo(
    () =>
      brandIcon ||
      pickKeyringThemeIcon(brandName as any, {
        needLightVersion: isDarkTheme,
      }) ||
      WALLET_BRAND_CONTENT?.[brandName]?.image ||
      KEYRING_ICONS[type],
    [type, brandName, brandIcon, isDarkTheme]
  );

  return (
    <div className="flex items-center">
      <ThemeIcon
        src={addressTypeIcon}
        width={20}
        height={20}
        viewBox="0 0 20 20"
      />
      <div className="flex flex-col ml-[8px]">
        <div className="text-l-neutral-title1 text-[13px] font-medium">
          {alianName}
        </div>
        <div className="flex items-center">
          <AddressViewer
            address={address}
            showArrow={false}
            className="text-[12px] text-l-neutral-body"
          />
          <Copy variant="address" data={address} className="w-14 h-14 ml-4" />
        </div>
      </div>
      <div className="ml-auto text-l-neutral-body text-[12px] ">
        {formatUsdValue(balance || 0)}
      </div>
    </div>
  );
};
