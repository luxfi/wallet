import { useMemo } from 'react';

import BigNumber from 'bignumber.js';

import type { ISizableTextProps } from '@onekeyhq/components';
import { NumberSizeableText } from '@onekeyhq/components';

import { useTokenListMapAtom } from '../../states/jotai/contexts/tokenList';

type IProps = {
  $key: string;
} & ISizableTextProps;

function TokenPriceChangeView(props: IProps) {
  const { $key, ...rest } = props;
  const [tokenListMap] = useTokenListMapAtom();
  const token = tokenListMap[$key];
  const priceChange = token?.price24h ?? 0;

  const content = useMemo(() => {
    let changeColor = '$textSubdued';
    let showPlusMinusSigns = false;
    const priceChangeBN = new BigNumber(priceChange);
    if (priceChangeBN.isGreaterThan(0)) {
      changeColor = '$textSuccess';
      showPlusMinusSigns = true;
    } else if (priceChangeBN.isLessThan(0)) {
      changeColor = '$textCritical';
      showPlusMinusSigns = true;
    }
    return (
      <NumberSizeableText
        formatter="priceChange"
        formatterOptions={{ showPlusMinusSigns }}
        color={changeColor}
        {...rest}
      >
        {priceChange}
      </NumberSizeableText>
    );
  }, [priceChange, rest]);
  return content;
}

export { TokenPriceChangeView };
