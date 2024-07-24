import React, { ReactNode } from 'react';
import './style.less';
import IconBack from 'ui/assets/icon-back.svg';

interface NavbarProps {
  back?: ReactNode | null;
  onBack?: () => void;
  children?: ReactNode;
  left?: ReactNode;
  right?: ReactNode;
  desc?: ReactNode;
}

const Navbar = (props: NavbarProps) => {
  const { back, left, right, onBack, children, desc } = props;
  return (
    <div className="lux-navbar">
      <div className="lux-navbar-container">
        <div className="lux-navbar-main">
          <div className="lux-navbar-left">
            <div className="lux-navbar-back" onClick={onBack}>
              {back ? back : <img src={IconBack} alt=""></img>}
            </div>
            {left}
          </div>
          <div className="lux-navbar-title">{children}</div>
          <div className="lux-navbar-right">{right}</div>
        </div>
        {desc ? <div className="lux-navbar-desc">{desc}</div> : null}
      </div>
    </div>
  );
};

export default Navbar;
