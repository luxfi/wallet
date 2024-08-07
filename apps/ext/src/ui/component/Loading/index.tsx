import clsx from 'clsx';
import React, { ReactNode } from 'react';
import './style.less';
import { SvgIconLoading } from 'ui/assets';

interface CopyProps {
  className?: string;
  style?: React.CSSProperties;
  children?: ReactNode;
  loading?: boolean;
}

const Loading = ({ className, style, children, loading }: CopyProps) => {
  return loading ? (
    <div className={clsx('lux-loading', className)} style={style}>
      <SvgIconLoading
        className="lux-loading-image"
        fill="#707280"
      ></SvgIconLoading>
      <div className="lux-loading-text">{children}</div>
    </div>
  ) : null;
};

export default Loading;
