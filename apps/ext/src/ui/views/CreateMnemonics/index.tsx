import React from 'react';
import { connectStore, useLuxDispatch, useLuxSelector } from 'ui/store';
import RiskCheck from './RiskCheck';
import DisplayMnemonic from './DisplayMnemonic';
import { useTranslation } from 'react-i18next';

const CreateMnemonic = () => {
  const step = useLuxSelector((s) => s.createMnemonics.step);
  const { t } = useTranslation();
  const dispatch = useLuxDispatch();
  React.useEffect(() => {
    dispatch.createMnemonics.getAllHDKeyrings();
  }, []);
  let node;

  switch (step) {
    case 'risk-check':
      node = <RiskCheck />;
      break;
    case 'display':
      node = <DisplayMnemonic />;
      break;
    default:
      throw new Error(t('page.newAddress.seedPhrase.importError'));
  }

  return <div className="w-screen h-screen bg-l-neutral-bg-2">{node}</div>;
};

export default connectStore()(CreateMnemonic);
