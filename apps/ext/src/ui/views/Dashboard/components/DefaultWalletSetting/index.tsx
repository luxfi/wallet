import { useWallet } from '@/ui/utils';
import { message } from 'antd';
import React, { useEffect, useState } from 'react';
import IconDefaultMetamask from 'ui/assets/icon-default-metamask.png';
import IconDefaultLux from 'ui/assets/icon-default-lux.png';
import './style.less';
import { useTranslation } from 'react-i18next';

const DefaultWalletSetting = () => {
  const [isConflict, setIsConflict] = useState(false);
  const [isDefault, setIsDefault] = useState(true);
  const wallet = useWallet();
  const { t } = useTranslation();

  const init = () => {
    wallet.isDefaultWallet().then(setIsDefault);
    wallet.getHasOtherProvider().then(setIsConflict);
  };

  const handleFlip = async (e: React.MouseEvent) => {
    e.preventDefault();
    handleSubmit();
  };

  const handleSubmit = async () => {
    await wallet.setIsDefaultWallet(!isDefault);
    setIsDefault(!isDefault);
    message.success({
      icon: <i />,
      content: (
        <span className="text-white">
          {t('page.dashboard.home.refreshTheWebPageToTakeEffect')}
        </span>
      ),
      duration: 2,
    });
  };

  useEffect(() => {
    init();
  }, []);

  if (!isConflict) {
    return null;
  }
  if (isDefault) {
    return (
      <>
        <div className="lux-default-wallet-setting">
          <img
            src={IconDefaultLux}
            alt=""
            className="w-[20px] h-[20px] mr-[8px]"
          />
          {t('page.dashboard.home.luxIsInUseAndMetamaskIsBanned')}
          <a href="#" onClick={handleFlip}>
            {t('page.dashboard.home.flip')}
          </a>
        </div>
      </>
    );
  }
  return (
    <>
      <div className="lux-default-wallet-setting is-metamask">
        <img
          src={IconDefaultMetamask}
          alt=""
          className="w-[20px] h-[20px] mr-[8px]"
        />
        {t('page.dashboard.home.metamaskIsInUseAndLuxIsBanned')}
        <a href="#" onClick={handleFlip}>
          {t('page.dashboard.home.flip')}
        </a>
      </div>
    </>
  );
};

export default DefaultWalletSetting;
