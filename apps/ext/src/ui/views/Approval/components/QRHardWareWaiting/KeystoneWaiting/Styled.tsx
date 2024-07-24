import React from 'react';
import clsx from 'clsx';

export const UnderlineButton = ({ children, onClick, className }) => {
  return (
    <div
      className={clsx(
        'text-center',
        'text-[15px] underline text-l-neutral-body',
        'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  );
};
