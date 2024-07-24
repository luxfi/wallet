import clsx from 'clsx';
import React, { ReactNode } from 'react';
import './style.less';

interface EmptyProps {
  className?: string;
  style?: React.CSSProperties;
  children?: ReactNode;
  title?: ReactNode;
  desc?: ReactNode;
}

const Empty = ({ className, style, children, title, desc }: EmptyProps) => {
  return (
    <div className={clsx('lux-empty', className)} style={style}>
      <img className="lux-empty-image" src="./images/nodata-tx.png" />
      <div className="lux-empty-content">
        {title && <div className="lux-empty-title">{title}</div>}
        <div className="lux-empty-desc">{children ? children : desc}</div>
      </div>
    </div>
  );
};

export default Empty;
