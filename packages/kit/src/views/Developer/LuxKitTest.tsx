import React, { useState } from 'react';
import { Page, Stack, Text, Button, Card, Badge, Divider } from '@onekeyhq/components';
import { useWalletConnection } from '../../hooks/useWalletConnection';
import { LuxKitConnectionButton } from '../DAppConnection/components/LuxKitConnectionButton';
import { walletConfig } from '@onekeyhq/shared/src/config/walletConfig';

/**
 * Developer test page for LuxKit integration
 * This page demonstrates all LuxKit features and capabilities
 */
export const LuxKitTest = () => {
  const {
    isConnected,
    address,
    chain,
    features,
    openConnectionModal,
    disconnectWallet,
    switchToNetwork,
    openAccountView,
    getWalletInfo,
  } = useWalletConnection();

  const [testResults, setTestResults] = useState<string[]>([]);
  const walletInfo = getWalletInfo();

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const testOpenModal = () => {
    addTestResult('Opening LuxKit modal...');
    openConnectionModal({ preferLuxKit: true });
  };

  const testOpenWithWalletConnect = () => {
    addTestResult('Opening with WalletConnect preference...');
    openConnectionModal({ preferLuxKit: false });
  };

  const testSwitchNetwork = () => {
    addTestResult('Testing network switch...');
    switchToNetwork(56); // Switch to BSC
  };

  const testAccountView = () => {
    addTestResult('Opening account view...');
    openAccountView();
  };

  const testDisconnect = () => {
    addTestResult('Disconnecting wallet...');
    disconnectWallet();
  };

  return (
    <Page>
      <Page.Header title="LuxKit Integration Test" />
      <Page.Body>
        <Stack space="$4" p="$4">
          {/* Configuration Status */}
          <Card>
            <Card.Header>
              <Text typography="HeadingMd">Configuration Status</Text>
            </Card.Header>
            <Card.Body>
              <Stack space="$2">
                <Stack direction="horizontal" justifyContent="space-between">
                  <Text>LuxKit Enabled</Text>
                  <Badge type={walletConfig.enableLuxKit ? 'success' : 'critical'}>
                    {walletConfig.enableLuxKit ? 'Yes' : 'No'}
                  </Badge>
                </Stack>
                <Stack direction="horizontal" justifyContent="space-between">
                  <Text>Prefer LuxKit</Text>
                  <Badge type={walletConfig.preferLuxKit ? 'success' : 'warning'}>
                    {walletConfig.preferLuxKit ? 'Yes' : 'No'}
                  </Badge>
                </Stack>
              </Stack>
            </Card.Body>
          </Card>

          {/* Connection Status */}
          <Card>
            <Card.Header>
              <Text typography="HeadingMd">Connection Status</Text>
            </Card.Header>
            <Card.Body>
              <Stack space="$2">
                <Stack direction="horizontal" justifyContent="space-between">
                  <Text>Connected</Text>
                  <Badge type={isConnected ? 'success' : 'default'}>
                    {isConnected ? 'Yes' : 'No'}
                  </Badge>
                </Stack>
                {isConnected && (
                  <>
                    <Stack direction="horizontal" justifyContent="space-between">
                      <Text>Address</Text>
                      <Text typography="Body2Mono" numberOfLines={1}>
                        {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'N/A'}
                      </Text>
                    </Stack>
                    <Stack direction="horizontal" justifyContent="space-between">
                      <Text>Chain</Text>
                      <Text>{chain?.name || 'Unknown'}</Text>
                    </Stack>
                    <Stack direction="horizontal" justifyContent="space-between">
                      <Text>Wallet</Text>
                      <Text>{walletInfo?.name || 'Unknown'}</Text>
                    </Stack>
                  </>
                )}
              </Stack>
            </Card.Body>
          </Card>

          {/* Wallet Features */}
          {isConnected && features && (
            <Card>
              <Card.Header>
                <Text typography="HeadingMd">Wallet Features</Text>
              </Card.Header>
              <Card.Body>
                <Stack space="$2">
                  <Stack direction="horizontal" justifyContent="space-between">
                    <Text>Ringtail Signatures</Text>
                    <Badge type={features.hasRingtailSignatures ? 'success' : 'default'}>
                      {features.hasRingtailSignatures ? 'Supported' : 'Not Supported'}
                    </Badge>
                  </Stack>
                  <Stack direction="horizontal" justifyContent="space-between">
                    <Text>Bridge Support</Text>
                    <Badge type={features.hasBridgeSupport ? 'success' : 'default'}>
                      {features.hasBridgeSupport ? 'Supported' : 'Not Supported'}
                    </Badge>
                  </Stack>
                  <Stack direction="horizontal" justifyContent="space-between">
                    <Text>Cross-Chain Ops</Text>
                    <Badge type={features.hasCrossChainOperations ? 'success' : 'default'}>
                      {features.hasCrossChainOperations ? 'Supported' : 'Not Supported'}
                    </Badge>
                  </Stack>
                </Stack>
              </Card.Body>
            </Card>
          )}

          {/* Test Actions */}
          <Card>
            <Card.Header>
              <Text typography="HeadingMd">Test Actions</Text>
            </Card.Header>
            <Card.Body>
              <Stack space="$2">
                <Text typography="Body2" color="$textSubdued">
                  Test LuxKit functionality with these actions:
                </Text>
                
                {/* Connection Button Component */}
                <Stack direction="horizontal" space="$2">
                  <Text flex={1}>LuxKit Connection Button:</Text>
                  <LuxKitConnectionButton
                    onConnect={(addr) => addTestResult(`Connected: ${addr}`)}
                    onDisconnect={() => addTestResult('Disconnected')}
                  />
                </Stack>

                <Divider />

                {/* Manual Test Buttons */}
                <Stack space="$2">
                  <Button onPress={testOpenModal} variant="secondary">
                    Open LuxKit Modal
                  </Button>
                  
                  <Button onPress={testOpenWithWalletConnect} variant="secondary">
                    Open WalletConnect Modal
                  </Button>

                  {isConnected && (
                    <>
                      <Button onPress={testSwitchNetwork} variant="secondary">
                        Switch to BSC
                      </Button>
                      
                      <Button onPress={testAccountView} variant="secondary">
                        Open Account View
                      </Button>
                      
                      <Button onPress={testDisconnect} variant="destructive">
                        Disconnect
                      </Button>
                    </>
                  )}
                </Stack>
              </Stack>
            </Card.Body>
          </Card>

          {/* Test Results */}
          {testResults.length > 0 && (
            <Card>
              <Card.Header>
                <Stack direction="horizontal" justifyContent="space-between">
                  <Text typography="HeadingMd">Test Results</Text>
                  <Button size="small" onPress={() => setTestResults([])}>
                    Clear
                  </Button>
                </Stack>
              </Card.Header>
              <Card.Body>
                <Stack space="$1">
                  {testResults.map((result, index) => (
                    <Text key={index} typography="Body2Mono" color="$textSubdued">
                      {result}
                    </Text>
                  ))}
                </Stack>
              </Card.Body>
            </Card>
          )}

          {/* Supported Wallets */}
          <Card>
            <Card.Header>
              <Text typography="HeadingMd">Supported Wallets</Text>
            </Card.Header>
            <Card.Body>
              <Stack space="$2">
                {Object.entries(walletConfig.luxKitWallets).map(([wallet, enabled]) => (
                  <Stack key={wallet} direction="horizontal" justifyContent="space-between">
                    <Text>{wallet.charAt(0).toUpperCase() + wallet.slice(1)}</Text>
                    <Badge type={enabled ? 'success' : 'default'}>
                      {enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </Stack>
                ))}
              </Stack>
            </Card.Body>
          </Card>
        </Stack>
      </Page.Body>
    </Page>
  );
};