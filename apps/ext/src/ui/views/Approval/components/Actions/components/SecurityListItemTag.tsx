import React from 'react';
import SecurityLevelTagNoText from '../../SecurityEngine/SecurityLevelTagNoText';
import { useLuxDispatch, useLuxSelector } from '@/ui/store';
import { Result } from '@luxfi/lux-security-engine';
import styled from 'styled-components';

export interface Props {
  id: string;
  engineResult: Result;
  inSubTable?: boolean;
}

const SecurityLevelTagNoTextStyled = styled(SecurityLevelTagNoText)``;

export const SecurityListItemTag: React.FC<Props> = ({
  id,
  engineResult,
  inSubTable,
}) => {
  const dispatch = useLuxDispatch();
  const { rules, processedRules } = useLuxSelector((s) => ({
    userData: s.securityEngine.userData,
    rules: s.securityEngine.rules,
    processedRules: s.securityEngine.currentTx.processedRules,
  }));
  const handleClickRule = (id: string) => {
    const rule = rules.find((item) => item.id === id);
    if (!rule) return;
    const result = engineResult;
    dispatch.securityEngine.openRuleDrawer({
      ruleConfig: rule,
      value: result?.value,
      level: result?.level,
      ignored: processedRules.includes(id),
    });
  };

  if (!engineResult) return null;

  return (
    <SecurityLevelTagNoTextStyled
      enable={engineResult.enable}
      level={processedRules.includes(id) ? 'proceed' : engineResult.level}
      onClick={() => handleClickRule(id)}
      inSubTable={inSubTable}
    />
  );
};
