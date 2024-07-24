import React from 'react';
import RcSwitch from 'rc-switch';
import { ReactComponent as LuxSVG } from 'ui/assets/ledger/lux.svg';
import { ReactComponent as LuxGraySVG } from 'ui/assets/ledger/lux-gray.svg';
import { ReactComponent as LoadingSVG } from '@/ui/assets/swap/loading.svg';

interface Props {
  onChange?: (value: boolean) => Promise<void>;
  checked?: boolean;
}
export const AddToLux: React.FC<Props> = ({ checked, onChange }) => {
  const [locked, setLocked] = React.useState(false);

  const handleOnChange = React.useCallback(async (value: boolean) => {
    setLocked(true);
    await onChange?.(value);
    setLocked(false);
  }, []);
  return (
    <RcSwitch
      disabled={locked}
      onChange={handleOnChange}
      prefixCls="ant-switch"
      className="addToLux"
      checked={checked}
      loadingIcon={
        <div className="ant-switch-handle">
          {locked ? (
            <LoadingSVG className="icon-loading animate-spin" />
          ) : checked ? (
            <LuxSVG
              className="icon"
              style={{
                borderRadius: '14px',
                marginTop: '-2.8px',
                marginLeft: '-1.8px',
              }}
            />
          ) : (
            <LuxGraySVG
              className="icon"
              style={{
                borderRadius: '14px',
                marginTop: '-2px',
                marginLeft: '-2px',
              }}
            />
          )}
        </div>
      }
    />
  );
};
