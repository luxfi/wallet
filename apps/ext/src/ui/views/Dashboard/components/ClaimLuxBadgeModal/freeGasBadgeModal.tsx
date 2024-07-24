import ImgLuxBadgeBgSemicircleShortLight from '@/ui/assets/badge/free-gas-bg-semicircle.svg';
// import ImgLuxBadgeBgSemicircleShortDark from '@/ui/assets/badge/bg-semicircle-s-dark.svg';
import ImgLuxBadgeBgSemicircleNoCodeLight from '@/ui/assets/badge/free-gas-bg-semicircle-nocode.svg';
// import ImgLuxBadgeBgSemicircleNoCodeDark from '@/ui/assets/badge/bg-semicircle-nocode-dark.svg';
import { Modal } from '@/ui/component';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import styled, { css } from 'styled-components';

import { ReactComponent as RCIconInfo } from '@/ui/assets/badge/info.svg';
import ImgLuxBadgeL from '@/ui/assets/badge/free-gas-badge-l.png';
import ImgLuxBadgeM from '@/ui/assets/badge/free-gas-badge-m.png';

import { ReactComponent as RcIconClose } from '@/ui/assets/badge/close.svg';

import ImgLink from '@/ui/assets/badge/link.svg';

import { useAccount } from '@/ui/store-hooks';
import { Button, Input, Skeleton } from 'antd';

import clsx from 'clsx';

import Lottie from 'lottie-react';

import { CurrentAccount } from '@/ui/component/CurrentAccout';
import { openInTab, useWallet } from '@/ui/utils';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router';
import { useAsync, useAsyncFn } from 'react-use';
import * as animationData from './success.json';
import { useThemeMode } from '@/ui/hooks/usePreference';

const Lux_BADGE_URL = 'https://debank.com/official-badge/134';

const LearnMore = 'https://x.com/lux_link/status/1785529719070368044';

const gotoLuxFiLuxBadge = () => {
  openInTab(Lux_BADGE_URL);
};

const Wrapper = styled.div<{
  isDarkMode?: boolean;
}>`
  [ant-click-animating-without-extra-node='true']::after {
    display: none;
  }
  width: 360px;
  height: 480px;
  border-radius: 16px;
  border-radius: 16px;
  background: var(--l-neutral-bg1, #1c1f2b);
  color: var(--l-neutral-foot, #babec5);
  box-shadow: 0px 24px 40px 0px rgba(19, 20, 26, 0.16);
  ${(props) => {
    if (props.isDarkMode) {
      return css`
        background-image: url(${ImgLuxBadgeBgSemicircleShortLight});
      `;
    }
    return css`
      background-image: url(${ImgLuxBadgeBgSemicircleShortLight});
    `;
  }}
  background-size: 360px 243px;
  background-repeat: no-repeat;
  background-size: contain;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;

  &.noCode {
    ${(props) => {
      if (props.isDarkMode) {
        return css`
          background-image: url(${ImgLuxBadgeBgSemicircleNoCodeLight});
        `;
      }
      return css`
        background-image: url(${ImgLuxBadgeBgSemicircleNoCodeLight});
      `;
    }}
    background-size: 360px 300px;

    .badge {
      width: 160px;
      height: 160px;
    }
    .account {
      margin-bottom: 78px;
    }
  }

  .badge {
    width: 120px;
    height: 120px;
  }

  .learn-more-tips {
    padding-left: 24px;
    padding-right: 20px;
    color: var(--l-neutral-foot, #6a7587);
    font-size: 13px;
    font-style: normal;
    font-weight: 400;
  }

  .title {
    margin-top: 14px;
    margin-bottom: 12px;
    color: #fff;
    text-align: center;
    font-size: 20px;
    font-style: normal;
    font-weight: 500;
    line-height: normal;
  }
  .account {
    margin-bottom: 67px;
  }
  .codeInput {
    width: 320px;
    padding: 12px;
    color: var(--l-neutral-title1, #f7fafc);
    font-size: 17px;
    font-style: normal;
    font-weight: 500;
    line-height: normal;
    /* background: #f5f6fa; */
    border: 1px solid #dcdfe4;
    &::placeholder {
      color: var(--l-neutral-foot, #6a7587);
      font-size: 15px;
      font-style: normal;
      font-weight: 400;
      line-height: normal;
    }
    &:hover,
    &:focus {
      border-color: var(--l-blue-default, #7084ff);
    }

    &.red,
    &.red:hover,
    &.red:focus {
      border-color: var(--l-red-default, #e34935);
    }
  }

  .box {
    position: relative;
    &.swap {
      top: -20px;
    }
    .error {
      position: absolute;
      bottom: -30px;
      left: 0;
      margin-top: 12px;
      color: var(--l-red-default, #e34935);
      font-size: 13px;
      font-style: normal;
      font-weight: 400;
      line-height: 18px;
    }

    .swapTips {
      position: absolute;
      bottom: -8px;
      transform: translateY(100%);
      left: 0;
      margin-top: 12px;
      position: absolute;
      border-radius: 4px;
      background: var(--l-neutral-card2, #f2f4f7);
      height: 72px;
      padding: 8px 12px;
      padding-left: 8px;
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      font-style: normal;
      font-weight: 400;
      line-height: 18px;

      .toSwap {
        cursor: pointer;
        color: var(--l-blue-default, #7084ff);
        text-decoration-line: underline;
      }
    }
  }

  .btn {
    margin-top: 58px;
    width: 320px;
    height: 44px;
    font-size: 15px;
    font-style: normal;
    font-weight: 500;
    border-radius: 6px;
    background: #109d63;
    color: var(--l-neutral-title2, #fff);
    border-color: transparent;
    transition: none !important;
    &.ant-btn[disabled],
    &.ant-btn[disabled]:hover {
      background: #109d63;
      border-color: transparent;
      opacity: 0.4;
    }
    &.ant-btn:hover,
    &.ant-btn:focus,
    &.ant-btn:active {
      color: var(--l-neutral-title2, #fff);
      background: #109d63;
      border-color: transparent;
      border-color: transparent;
      box-shadow: 0px 8px 16px 0px rgba(58, 178, 128, 0.16);
    }

    &.more {
      margin-top: 32px;
      width: 291px;
      height: 50px;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 4px;
    }
  }

  .tips {
    margin-top: 16px;
    color: var(--l-neutral-foot, #6a7587);
    font-size: 13px;
    font-style: normal;
    font-weight: 400;
    line-height: 18px;
    text-decoration-line: underline;
    cursor: pointer;
  }
`;

const badgeName = 'Lux_free_gas';

const ClaimLuxBadge = ({ onClaimed }: { onClaimed?: () => void }) => {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [txTips, setTxTips] = useState(false);

  const [currentAccount] = useAccount();

  const wallet = useWallet();
  const {
    value: claimeInfo,
    loading: badgeHasClaimedLoading,
  } = useAsync(async () => {
    return wallet.openapi.badgeHasClaimedByName({
      id: currentAccount?.address || '',
      name: badgeName,
    });
  }, [currentAccount?.address]);

  const {
    value: mintInfo,
    loading: badgeHasMintedLoading,
  } = useAsync(async () => {
    return wallet.openapi.badgeHasMintedByName({
      id: currentAccount?.address || '',
      name: badgeName,
    });
  }, [currentAccount?.address]);

  const [
    { loading: mintLoading, value: mintResult, error: mintError },
    mint,
  ] = useAsyncFn(async () => {
    if (code && currentAccount?.address) {
      lockErrorRef.current = false;
      return wallet.openapi.mintBadgeByName({
        code,
        userAddr: currentAccount?.address,
        name: badgeName,
      });
    }
  }, [code, currentAccount?.address]);

  const lockErrorRef = useRef(true);

  const handleClaim = useCallback(() => {
    if (code && currentAccount?.address) {
      mint();
    }
  }, [code, currentAccount?.address, mint]);

  const noCode = !claimeInfo?.has_claimed;
  const loading = badgeHasClaimedLoading || badgeHasMintedLoading;

  const onInputChange = useCallback((e) => {
    setError('');
    setTxTips(false);
    setCode(e.target.value);
    lockErrorRef.current = true;
  }, []);

  const gotoLearnMore = useCallback(() => {
    openInTab(LearnMore);
  }, []);

  const { isDarkTheme } = useThemeMode();

  if (!lockErrorRef.current && !mintLoading && mintError?.message) {
    if (mintError?.message.includes('Free Gas')) {
      setTxTips(true);
    } else {
      setError(mintError?.message);
    }
    lockErrorRef.current = true;
  }

  useEffect(() => {
    if (mintResult?.is_success || mintInfo?.has_minted) {
      onClaimed?.();
    }
  }, [onClaimed, mintResult?.is_success, mintInfo?.has_minted]);

  if (mintResult?.is_success || mintInfo?.has_minted) {
    return (
      <ClaimSuccess
        num={
          mintInfo?.has_minted ? mintInfo?.inner_id : mintResult?.inner_id || 0
        }
      />
    );
  }

  return (
    <Wrapper
      className={clsx({ noCode }, txTips && 'h-[505px]')}
      isDarkMode={isDarkTheme}
    >
      <img
        src={ImgLuxBadgeM}
        className="badge"
        alt={t('page.dashboard.luxBadge.imageLabel')}
      />
      <div className="title">{t('page.dashboard.luxBadge.freeGasTitle')}</div>
      <CurrentAccount noInvert={false} className="account" />
      {!noCode && (
        <>
          <div className={clsx('box widget-has-ant-input', txTips && 'swap')}>
            <Input
              className={clsx('codeInput', error && 'red')}
              placeholder={t('page.dashboard.luxBadge.enterClaimCode')}
              value={code}
              onChange={onInputChange}
              autoFocus
            />
            {error && <div className="error">{error}</div>}
            {txTips && (
              <div className="swapTips">
                <div className="w-12 h-12 self-start mt-[4px]">
                  <RCIconInfo viewBox="0 0 12 12" className="w-12 h-12" />
                </div>

                <span>
                  {t('page.dashboard.luxBadge.freeGasTip')}{' '}
                  <span onClick={gotoLearnMore} className="toSwap">
                    {t('page.dashboard.luxBadge.learnMore')}
                  </span>
                </span>
              </div>
            )}
          </div>
          <Button
            size="large"
            className={clsx('btn', txTips && 'mt-[83px]')}
            disabled={!code || !!error || txTips}
            onClick={handleClaim}
            loading={mintLoading}
          >
            {t('page.dashboard.luxBadge.claim')}
          </Button>
          <div className="tips" onClick={gotoLuxFiLuxBadge}>
            {t('page.dashboard.luxBadge.viewYourClaimCode')}
          </div>
        </>
      )}
      {noCode ? (
        loading ? (
          <>
            <Skeleton.Input active className="w-[306px] h-[43px] mb-[21px]" />
            <Skeleton.Input active className="w-[234px] h-[48px]" />
          </>
        ) : (
          <>
            <div className="learn-more-tips">
              {t('page.dashboard.luxBadge.freeGasNoCode')}{' '}
            </div>
            <Button className="btn more" onClick={gotoLuxFiLuxBadge}>
              <span>{t('page.dashboard.luxBadge.learnMoreOnLuxfi')}</span>
              <img src={ImgLink} className="ml-4 w-20 h-20" />
            </Button>
          </>
        )
      ) : null}
    </Wrapper>
  );
};

const ClaimSuccessWrapper = styled.div`
  width: 360px;
  height: 480px;
  border-radius: 16px;
  /* background-color: #fff; */
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  .badge {
    width: 160px;
    height: 160px;
  }
  .title,
  .desc {
    text-align: center;
    font-size: 24px;
    font-style: normal;
    font-weight: 500;
    line-height: normal;
  }

  .title {
    color: var(--l-neutral-title1, #192945);
  }

  .desc {
    font-size: 17px;
    margin-top: 24px;
    margin-bottom: 32px;
    color: var(--l-green-default, #2abb7f);
  }
  .title {
    margin-bottom: 16px;
  }

  .account {
    margin-bottom: 54px;
    background: var(--l-neutral-card2, rgba(255, 255, 255, 0.06));
  }
  .btn {
    width: 252px;
    height: 50px;
    font-size: 15px;
    font-style: normal;
    font-weight: 500;
    border-radius: 6px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 4px;
    background: #109d63;
    border: none;
    &.ant-btn:hover {
      box-shadow: 0px 8px 16px 0px rgba(58, 178, 128, 0.16);
    }
  }
  .confetti {
    position: absolute;
    top: 20px;
    left: 0;
    pointer-events: none;
  }
`;

const ClaimSuccess = ({ num }: { num: number }) => {
  const { t } = useTranslation();
  return (
    <ClaimSuccessWrapper>
      <img
        src={ImgLuxBadgeL}
        className="badge"
        alt={t('page.dashboard.luxBadge.imageLabel')}
      />
      <div className="desc">
        {t('page.dashboard.luxBadge.luxFreeGasUserNo', {
          num,
        })}
      </div>
      <div className="title">{t('page.dashboard.luxBadge.claimSuccess')}</div>
      <CurrentAccount className="account" />
      <Button className="btn" onClick={gotoLuxFiLuxBadge}>
        <span>{t('page.dashboard.luxBadge.viewOnLuxfi')}</span>
        <img src={ImgLink} className="ml-4 w-20 h-20" />
      </Button>
      <div className="confetti">
        <Lottie animationData={animationData} loop height={360} width={360} />
      </div>
    </ClaimSuccessWrapper>
  );
};

const StyledModal = styled(Modal)`
  padding-bottom: 0;
  .ant-modal-content {
    border-radius: 16px;
    overflow: initial;
  }
  .ant-modal-body {
    padding: 0;
    max-height: 526px;
  }
  .ant-modal-close {
    top: -10px;
    right: -10px;
  }
  .ant-modal-close-x {
    width: auto;
    height: auto;
  }
`;

export const ClaimLuxFreeGasBadgeModal = ({
  visible,
  onCancel,
  onClaimed,
}: {
  visible: boolean;
  onCancel: () => void;
  onClaimed?: () => void;
}) => {
  return (
    <StyledModal
      className="modal-support-darkmode"
      visible={visible}
      title={null}
      onCancel={onCancel}
      destroyOnClose
      closeIcon={<RcIconClose />}
    >
      <ClaimLuxBadge onClaimed={onClaimed} />
    </StyledModal>
  );
};
