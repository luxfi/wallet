import React, { useState } from 'react';
import { useAccount, useBalance, useNetwork, useSwitchNetwork, useSignMessage } from 'wagmi';
import { LuxKitModal } from '../../components/WalletConnect/LuxKitModal';
import { useLuxWalletFeatures } from '../../hooks/useLuxWalletFeatures';
import { formatEther } from 'viem';

export const LuxKitDemo: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { chain } = useNetwork();
  const { chains, switchNetwork } = useSwitchNetwork();
  const { data: balance } = useBalance({ address });
  const { signMessage } = useSignMessage();
  const { features, signWithRingtail, bridgeAssets, isLoading, error } = useLuxWalletFeatures();
  
  const [message, setMessage] = useState('Hello from Lux Wallet!');
  const [signature, setSignature] = useState('');
  const [ringtailResult, setRingtailResult] = useState<any>(null);

  const handleSignMessage = async () => {
    if (!address) return;
    
    try {
      const sig = await signMessage({ message });
      setSignature(sig || '');
    } catch (err) {
      console.error('Failed to sign message:', err);
    }
  };

  const handleRingtailSign = async () => {
    const result = await signWithRingtail(message);
    if (result) {
      setRingtailResult(result);
    }
  };

  const handleBridgeDemo = async () => {
    if (!features?.hasBridgeSupport) {
      alert('Please connect a Bridge wallet to use this feature');
      return;
    }

    const result = await bridgeAssets({
      fromChain: 1, // Ethereum
      toChain: 7777777, // Lux Network
      token: '0x0000000000000000000000000000000000000000', // Native token
      amount: BigInt('1000000000000000'), // 0.001 ETH
    });

    if (result) {
      alert(`Bridge transaction initiated: ${result}`);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">LuxKit Integration Demo</h1>
      
      {/* Connection Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Wallet Connection</h2>
        <div className="flex items-center justify-between">
          <div>
            {isConnected ? (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Connected Address</p>
                <p className="font-mono">{address}</p>
                {balance && (
                  <p className="text-sm mt-1">
                    Balance: {formatEther(balance.value)} {balance.symbol}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-400">Not connected</p>
            )}
          </div>
          <LuxKitModal />
        </div>
      </div>

      {/* Network Section */}
      {isConnected && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Network</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Current Network</p>
              <p className="font-semibold">{chain?.name || 'Unknown'}</p>
            </div>
            <select
              value={chain?.id}
              onChange={(e) => switchNetwork?.(Number(e.target.value))}
              className="px-3 py-2 border rounded-lg"
            >
              {chains.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Features Section */}
      {isConnected && features && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Wallet Features</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className={`text-2xl mb-2 ${features.hasRingtailSignatures ? 'text-green-500' : 'text-gray-400'}`}>
                {features.hasRingtailSignatures ? '✓' : '✗'}
              </div>
              <p className="text-sm">Ringtail Signatures</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className={`text-2xl mb-2 ${features.hasBridgeSupport ? 'text-green-500' : 'text-gray-400'}`}>
                {features.hasBridgeSupport ? '✓' : '✗'}
              </div>
              <p className="text-sm">Bridge Support</p>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className={`text-2xl mb-2 ${features.hasCrossChainOperations ? 'text-green-500' : 'text-gray-400'}`}>
                {features.hasCrossChainOperations ? '✓' : '✗'}
              </div>
              <p className="text-sm">Cross-Chain Ops</p>
            </div>
          </div>
        </div>
      )}

      {/* Signing Section */}
      {isConnected && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Message Signing</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                rows={3}
              />
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={handleSignMessage}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Sign Message
              </button>
              
              {features?.hasRingtailSignatures && (
                <button
                  onClick={handleRingtailSign}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing...' : 'Sign with Ringtail'}
                </button>
              )}
              
              {features?.hasBridgeSupport && (
                <button
                  onClick={handleBridgeDemo}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  disabled={isLoading}
                >
                  Bridge Demo
                </button>
              )}
            </div>

            {signature && (
              <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                <p className="text-sm font-medium mb-2">Signature:</p>
                <p className="font-mono text-xs break-all">{signature}</p>
              </div>
            )}

            {ringtailResult && (
              <div className="mt-4 p-4 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <p className="text-sm font-medium mb-2">Ringtail Signature:</p>
                <div className="space-y-2 text-xs font-mono">
                  <p>Signature: {ringtailResult.signature.slice(0, 20)}...</p>
                  <p>ZK Proof: {ringtailResult.zkProof || 'N/A'}</p>
                  <p>Type: {ringtailResult.proofType}</p>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 p-4 bg-red-100 dark:bg-red-900 rounded-lg">
                <p className="text-sm text-red-800 dark:text-red-200">Error: {error.message}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-6">
        <h3 className="font-semibold mb-2">Demo Instructions:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Click "Connect Wallet" to open the LuxKit modal</li>
          <li>Select a wallet (Lux, Bridge, Ringtail, X-Chain, or Rabby)</li>
          <li>Try different features based on the connected wallet type</li>
          <li>Switch networks using the dropdown</li>
          <li>Sign messages with standard or Ringtail signatures</li>
        </ol>
      </div>
    </div>
  );
};