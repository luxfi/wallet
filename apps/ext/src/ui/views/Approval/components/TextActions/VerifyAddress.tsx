import React from 'react';
import styled from 'styled-components';
import { useTranslation } from 'react-i18next';
import { VerifyAddressAction } from '@luxfi/lux-api/dist/types';
import { Col, Row, Table } from '../Actions/components/Table';
import * as Values from '../Actions/components/Values';
import { Result } from '@luxfi/lux-security-engine';

const Wrapper = styled.div``;

const VerifyAddress = ({
  data,
}: {
  data: VerifyAddressAction;
  engineResults: Result[];
}) => {
  const { t } = useTranslation();

  return (
    <Wrapper>
      <Table>
        <Col>
          <Row isTitle>{t('page.signText.createKey.interactDapp')}</Row>
          <Row>
            <Values.Protocol value={data.protocol} />
          </Row>
        </Col>
        <Col>
          <Row isTitle>{t('page.signText.createKey.description')}</Row>
          <Row wrap>{data.desc}</Row>
        </Col>
      </Table>
    </Wrapper>
  );
};

export default VerifyAddress;
