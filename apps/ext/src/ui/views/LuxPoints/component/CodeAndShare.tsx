import { formatTokenAmount, openInTab } from '@/ui/utils';
import { copyTextToClipboard } from '@/ui/utils/clipboard';
import { Skeleton, message } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as IconCopy } from 'ui/assets/lux-points/copy.svg';
import IconSuccess from 'ui/assets/success.svg';
import { useLuxPoints } from '../hooks';
import { ReactComponent as IconTwitter } from 'ui/assets/lux-points/twitter-x.svg';

export const shareLuxPointsTwitter = ({
  snapshot,
  invitedCode,
}: {
  snapshot?: ReturnType<typeof useLuxPoints>['snapshot'];
  usedOtherInvitedCode?: boolean;
  invitedCode?: string;
}) => {
  if (!snapshot) return;

  const text = encodeURIComponent(`Even if you haven't used Lux before, you can get points now!

Lux Points Season 2 is here with bigger rewards – 1 Billion points in total! 🎉 @lux_link

Check your points before you claim!

Use my referral code ${invitedCode} for an extra bonus!

https://lux.link/points?code=${invitedCode}
`);

  openInTab(`https://twitter.com/intent/tweet?text=${text}`);
};

export const CodeAndShare = ({
  invitedCode,
  snapshot,
  loading,
  usedOtherInvitedCode,
}: {
  loading?: boolean;
  invitedCode?: string;
  snapshot?: ReturnType<typeof useLuxPoints>['snapshot'];
  usedOtherInvitedCode?: boolean;
}) => {
  const { t } = useTranslation();
  const copyInvitedCode = React.useCallback(() => {
    copyTextToClipboard(invitedCode || '');
    message.success({
      icon: <img src={IconSuccess} className="icon icon-success" />,
      content: t('page.luxPoints.referral-code-copied'),
    });
  }, [invitedCode]);

  const share = React.useCallback(() => {
    shareLuxPointsTwitter({ snapshot, usedOtherInvitedCode, invitedCode });
  }, [snapshot, usedOtherInvitedCode, invitedCode]);

  if (loading) {
    return <CodeAndShareLoading />;
  }

  return (
    <div className="flex items-center justify-between text-[13px] font-medium text-l-neutral-title1">
      <div
        onClick={copyInvitedCode}
        className="border border-transparent hover:bg-lux-blue-light1 hover:border hover:border-lux-blue-default cursor-pointer rounded-[6px] w-[172px] h-[40px] flex items-center justify-center gap-[4px] bg-l-neutral-card2"
      >
        <span>{invitedCode?.toUpperCase()}</span>
        <IconCopy className="w-[16px]" />
      </div>
      <div
        onClick={share}
        className="border border-transparent hover:bg-lux-blue-light1 hover:border hover:border-lux-blue-default cursor-pointer rounded-[6px] w-[172px] h-[40px] flex items-center justify-center gap-[4px] bg-l-neutral-card2"
      >
        <span>{t('page.luxPoints.share-on')}</span>
        <IconTwitter className="w-[16px]" />
      </div>
    </div>
  );
};

const CodeAndShareLoading = () => {
  return (
    <div className="flex items-center justify-between">
      <Skeleton.Input
        className="rounded-[6px]"
        style={{
          width: 172,
          height: 40,
        }}
      />
      <Skeleton.Input
        className="rounded-[6px]"
        style={{
          width: 172,
          height: 40,
        }}
      />
    </div>
  );
};
