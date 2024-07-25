/* eslint-disable global-require */
import React from 'react';
import type { PropsWithChildren } from 'react';

import { Splash } from '@onekeyhq/components';

export function SplashProvider({ children }: PropsWithChildren<unknown>) {
  return <Splash>{children}</Splash>;
}
