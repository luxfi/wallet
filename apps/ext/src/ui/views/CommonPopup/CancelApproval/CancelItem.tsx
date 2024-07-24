import clsx from 'clsx';
import React from 'react';
import IconArrowRight from '@/ui/assets/dashboard/settings/icon-right-arrow.svg';

export interface Props {
  onClick(): void;
}

export const CancelItem: React.FC<Props> = ({ children, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'px-16 py-[15px]',
        'flex items-start justify-between',
        'text-l-neutral-title-1 text-14 font-medium',
        'border rounded-[8px] border-transparent',
        'bg-l-neutral-card-1  cursor-pointer',
        'hover:bg-l-blue-light-1',
        'hover:border-lux-blue-default'
      )}
    >
      <span>{children}</span>
      <img src={IconArrowRight} className="w-16" />
    </div>
  );
};
