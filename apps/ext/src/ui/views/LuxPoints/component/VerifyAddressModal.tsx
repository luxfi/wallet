import styled from 'styled-components';
import { Modal } from '@/ui/component';
import React from 'react';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { useWallet } from '@/ui/utils';
import clsx from 'clsx';

const StyledModal = styled(Modal)`
  padding-bottom: 0;
  .ant-modal-content {
    border-radius: 16px;
    overflow: initial;
  }
  .ant-modal-body {
    padding: 0;
  }
`;

const NoIcon = () => null;

export const ClaimLuxVerifyModal = ({
  visible,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) => {
  return (
    <StyledModal
      visible={visible}
      title={null}
      onCancel={onCancel}
      destroyOnClose
      closeIcon={NoIcon}
    >
      <Inner onCancel={onCancel} onConfirm={onConfirm} />
    </StyledModal>
  );
};

const Inner = ({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) => {
  const { t } = useTranslation();

  return (
    <div className="w-[360px] bg-l-neutral-bg-1 p-[20px] pb-[24px] rounded-[8px] leading-[normal]">
      <div className="text-l-neutral-title1 text-[20px] font-medium text-center">
        {t('page.luxPoints.referralCode.verifyAddressModal.verify-address')}
      </div>
      <div className="mt-[12px] text-[15px]  text-l-neutral-body">
        {t(
          'page.luxPoints.referralCode.verifyAddressModal.please-sign-this-text-message-to-verify-that-you-are-the-owner-of-this-address'
        )}
      </div>
      <div className="mt-[48px]  flex justify-center items-center gap-16">
        <Button
          type="ghost"
          onClick={onCancel}
          className={clsx(
            'flex-1 h-[44px] text-[15px] font-medium border-blue-light text-l-blue-default',
            'hover:bg-[#8697FF1A] active:bg-[#0000001A]',
            'before:content-none'
          )}
        >
          {t('page.luxPoints.referralCode.verifyAddressModal.cancel')}
        </Button>
        <Button
          type="primary"
          className="flex-1 h-[44px] text-[15px] font-medium text-l-neutral-title2"
          onClick={onConfirm}
        >
          {t('page.luxPoints.referralCode.verifyAddressModal.sign')}
        </Button>
      </div>
    </div>
  );
};
