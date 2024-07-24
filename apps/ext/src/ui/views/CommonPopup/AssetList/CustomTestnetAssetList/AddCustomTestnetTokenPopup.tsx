import IconUnknown from '@/ui/assets/token-default.svg';
import { Popup } from '@/ui/component';
import ChainSelectorModal from '@/ui/component/ChainSelector/Modal';
import { TooltipWithMagnetArrow } from '@/ui/component/Tooltip/TooltipWithMagnetArrow';
import { formatAmount, useWallet } from '@/ui/utils';
import { findChain, getChainList, getTestnetChainList } from '@/utils/chain';
import { CHAINS_ENUM } from '@luxfi/common';
import { useRequest, useSetState } from 'ahooks';
import { Button, Form, Input, Spin, message } from 'antd';
import { useForm } from 'antd/lib/form/Form';
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { Loading3QuartersOutlined } from '@ant-design/icons';
import { ReactComponent as RcIconDown } from '@/ui/assets/dashboard/portfolio/cc-down.svg';
import { ReactComponent as RcIconCheck } from '@/ui/assets/dashboard/portfolio/cc-check.svg';
import { ReactComponent as RcIconChecked } from '@/ui/assets/dashboard/portfolio/cc-checked.svg';
import clsx from 'clsx';
import { useThemeMode } from '@/ui/hooks/usePreference';
interface Props {
  visible?: boolean;
  onClose?(): void;
  onConfirm?(): void;
}

const Wraper = styled.div`
  .ant-form-item {
    margin-bottom: 16px;
  }
  .ant-form-item-label > label {
    color: var(--l-neutral-body, #3e495e);
    font-size: 13px;
    line-height: 16px;
  }

  .ant-input {
    height: 52px;
    width: 100%;
    margin-left: auto;
    margin-right: auto;
    background: transparent;
    border: 1px solid var(--l-neutral-line, #d3d8e0);
    border-radius: 6px;

    color: var(--l-neutral-title1, #192945);
    font-size: 15px;
    font-weight: 500;

    &:focus {
      border-color: var(--l-blue-default, #7084ff);
    }

    &::placeholder {
      font-size: 14px;
      font-weight: 400;
    }
  }
  .ant-input[disabled] {
    background: var(--l-neutral-card2, #f2f4f7);
    border-color: transparent;
    &:hover {
      border-color: transparent;
    }
  }
  .ant-form-item-has-error .ant-input,
  .ant-form-item-has-error .ant-input:hover {
    border: 1px solid var(--l-red-default, #e34935);
  }

  .ant-form-item-explain.ant-form-item-explain-error {
    color: var(--l-red-default, #e34935);
    font-size: 13px;
    line-height: 16px;
    min-height: 16px;
  }
`;

const Footer = styled.div`
  height: 84px;
  border-top: 0.5px solid var(--l-neutral-line, rgba(255, 255, 255, 0.1));
  background: var(--l-neutral-card-1, rgba(255, 255, 255, 0.06));
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
`;

export const AddCustomTestnetTokenPopup = ({
  visible,
  onClose,
  onConfirm,
}: Props) => {
  const wallet = useWallet();
  const [chainSelectorState, setChainSelectorState] = useSetState<{
    visible: boolean;
    chain: CHAINS_ENUM | null;
  }>({
    visible: false,
    chain: getChainList('testnet')?.[0]?.enum || null,
  });

  const chain = findChain({ enum: chainSelectorState.chain });
  const [tokenId, setTokenId] = useState('');
  const [checked, setChecked] = useState(false);
  const { t } = useTranslation();
  const [form] = useForm();

  const { data: token, runAsync: runGetToken, loading, error } = useRequest(
    async () => {
      const currentAccount = await wallet.getCurrentAccount();
      if (!chain?.id || !tokenId) {
        return null;
      }
      setChecked(false);
      form.setFields([
        {
          name: 'address',
          errors: [],
        },
      ]);
      return wallet.getCustomTestnetToken({
        address: currentAccount!.address,
        chainId: chain.id,
        tokenId,
      });
    },
    {
      refreshDeps: [chain?.id, tokenId],

      onError: (e) => {
        form.setFields([
          {
            name: 'address',
            errors: [t('page.dashboard.assets.AddTestnetToken.notFound')],
          },
        ]);
      },
    }
  );

  const { runAsync: runAddToken, loading: isSubmitting } = useRequest(
    async () => {
      if (!chain?.id || !tokenId) {
        return null;
      }
      return wallet.addCustomTestnetToken({
        chainId: chain.id,
        id: tokenId,
        symbol: token!.symbol,
        decimals: token!.decimals,
      });
    },
    {
      manual: true,
    }
  );

  const handleConfirm = async () => {
    try {
      await runAddToken();
      onConfirm?.();
    } catch (e) {
      message.error(e?.message);
    }
  };

  useEffect(() => {
    if (!visible) {
      setChainSelectorState({
        visible: false,
        chain: getChainList('testnet')?.[0]?.enum || null,
      });
      setTokenId('');
      setChecked(false);
      form.resetFields();
    }
  }, [visible]);

  const inputRef = useRef<Input>(null);
  useLayoutEffect(() => {
    if (visible) {
      const timer = setTimeout(() => inputRef.current?.focus(), 250);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  const { isDarkTheme } = useThemeMode();

  return (
    <>
      <Popup
        visible={visible}
        closable={false}
        height={494}
        onClose={onClose}
        className="add-custom-token-popup"
        push={false}
        title={
          <div className="text-l-neutral-title1">
            {t('page.dashboard.assets.AddTestnetToken.title')}
          </div>
        }
        maskStyle={
          isDarkTheme
            ? {
                backgroundColor: 'transparent',
              }
            : undefined
        }
      >
        <Wraper>
          <Form layout="vertical" form={form}>
            <Form.Item label="Chain">
              <div
                onClick={() => {
                  setChainSelectorState({
                    visible: true,
                  });
                }}
              >
                {!chain ? (
                  <div
                    className={clsx(
                      'flex items-center bg-l-neutral-card2 rounded-[6px]',
                      'px-[16px] py-[12px] min-h-[52px] cursor-pointer',
                      'border-[1px] border-transparent',
                      'hover:border-lux-blue-default hover:bg-l-blue-light1'
                    )}
                  >
                    <div className="text-l-neutral-title1 text-[15px] leading-[18px]">
                      {t('page.dashboard.assets.AddTestnetToken.selectChain')}
                    </div>
                    <div className="ml-auto text-l-neutral-body">
                      <RcIconDown />
                    </div>
                  </div>
                ) : (
                  <div
                    className={clsx(
                      'flex items-center bg-l-neutral-card2 rounded-[6px]',
                      'gap-[8px] px-[16px] py-[12px] min-h-[52px] cursor-pointer',
                      'border-[1px] border-transparent',
                      'hover:border-lux-blue-default hover:bg-l-blue-light1'
                    )}
                  >
                    <img
                      src={chain?.logo}
                      alt=""
                      className="w-[28px] h-[28px] rounded-full"
                    />
                    <div className="text-l-neutral-title1 text-[15px] leading-[18px]">
                      {chain?.name}
                    </div>
                    <div className="ml-auto text-l-neutral-body">
                      <RcIconDown />
                    </div>
                  </div>
                )}
              </div>
            </Form.Item>
            <Form.Item
              label={t('page.dashboard.assets.AddTestnetToken.tokenAddress')}
              name="address"
            >
              <Input
                ref={inputRef}
                autoFocus
                placeholder={t(
                  'page.dashboard.assets.AddTestnetToken.tokenAddressPlaceholder'
                )}
                onChange={(e) => {
                  setTokenId(e.target.value);
                }}
                autoComplete="off"
              />
            </Form.Item>
            {loading ? (
              <div className="flex items-center text-l-neutral-body text-[13px] gap-[4px]">
                <Loading3QuartersOutlined className="animate-spin" />{' '}
                {t('page.dashboard.assets.AddTestnetToken.searching')}
              </div>
            ) : (
              <>
                {token && !error ? (
                  <Form.Item label="Found Token">
                    <div
                      onClick={() => {
                        setChecked((v) => !v);
                      }}
                      className={clsx(
                        'flex items-center gap-[12px] rounded-[6px] cursor-pointer',
                        'bg-l-neutral-card2 min-h-[52px] px-[16px] py-[14px]',
                        'border-[1px] border-transparent',
                        checked && 'border-lux-blue-default'
                      )}
                    >
                      <div className="relative h-[24px]">
                        <img
                          src={IconUnknown}
                          alt=""
                          className="w-[24px] h-[24px] rounded-full"
                        />
                        <TooltipWithMagnetArrow
                          title={chain?.name}
                          className="rectangle w-[max-content]"
                        >
                          <img
                            className="w-14 h-14 absolute right-[-2px] top-[-2px] rounded-full"
                            src={chain?.logo || IconUnknown}
                            alt={chain?.name}
                          />
                        </TooltipWithMagnetArrow>
                      </div>
                      <div className="text-l-neutral-title1 text-[13px] leading-[16px] font-medium">
                        {formatAmount(token.amount || 0)} {token.symbol}
                      </div>
                      {checked ? (
                        <div className="ml-auto text-l-blue-default">
                          <RcIconChecked />
                        </div>
                      ) : (
                        <div className="ml-auto text-l-neutral-body">
                          <RcIconCheck />
                        </div>
                      )}
                    </div>
                  </Form.Item>
                ) : null}
              </>
            )}
          </Form>
          <Footer>
            <Button
              type="primary"
              size="large"
              className="lux-btn-ghost w-[172px]"
              ghost
              onClick={onClose}
            >
              {t('global.Cancel')}
            </Button>
            <Button
              type="primary"
              size="large"
              className="w-[172px]"
              disabled={Boolean(!token || error || loading || !checked)}
              loading={isSubmitting}
              onClick={handleConfirm}
            >
              {t('global.Confirm')}
            </Button>
          </Footer>
        </Wraper>
      </Popup>
      <ChainSelectorModal
        hideTestnetTab={false}
        hideMainnetTab={true}
        value={chainSelectorState.chain || CHAINS_ENUM.ETH}
        visible={chainSelectorState.visible}
        onCancel={() => {
          setChainSelectorState({
            visible: false,
          });
        }}
        onChange={(value) => {
          setChainSelectorState({
            visible: false,
            chain: value,
          });
        }}
      />
    </>
  );
};
