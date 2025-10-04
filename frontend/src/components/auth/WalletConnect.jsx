import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton, WalletDisconnectButton } from '@solana/wallet-adapter-react-ui';
import { Wallet, Copy, ExternalLink } from 'lucide-react';
import Button from '../common/Button';
import Card from '../common/Card';
import solanaService from '../../services/solana';

export default function WalletConnect({ onWalletAuth }) {
  const { publicKey, connected, disconnect, signMessage } = useWallet();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (connected && publicKey) {
      loadWalletData();
    }
  }, [connected, publicKey]);

  const loadWalletData = async () => {
    if (!publicKey) return;
    
    try {
      const walletBalance = await solanaService.getBalance(publicKey.toString());
      setBalance(walletBalance);
    } catch (error) {
      console.error('Error loading wallet data:', error);
    }
  };

  const handleWalletAuth = async () => {
    if (!publicKey || !signMessage) return;

    try {
      setLoading(true);
      const timestamp = Date.now();
      const message = `Sign this message to authenticate with MEV Analytics Platform.\nTimestamp: ${timestamp}`;
      const signature = await solanaService.signMessage(message, { signMessage });
      
      if (onWalletAuth) {
        await onWalletAuth({
          publicKey: publicKey.toString(),
          signature: Array.from(signature),
          message
        });
      }
    } catch (error) {
      console.error('Wallet authentication failed:', error);
      alert('Wallet authentication failed: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openExplorer = () => {
    if (publicKey) {
      const network = 'devnet'; // Use config.solana.network in production
      window.open(`https://explorer.solana.com/address/${publicKey.toString()}?cluster=${network}`, '_blank');
    }
  };

  if (!connected) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <Wallet className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Connect Your Wallet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Connect your Solana wallet to access advanced features and authenticate with the platform.
          </p>
          <WalletMultiButton className="!bg-primary-600 hover:!bg-primary-700" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Wallet Connected
        </h3>
        <WalletDisconnectButton className="!bg-gray-600 hover:!bg-gray-700" />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Address</p>
            <p className="font-mono text-sm text-gray-900 dark:text-gray-100">
              {publicKey?.toString().slice(0, 8)}...{publicKey?.toString().slice(-8)}
            </p>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={copyAddress}
              className="p-2"
            >
              <Copy className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={openExplorer}
              className="p-2"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Balance</p>
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              {balance.toFixed(4)} SOL
            </p>
          </div>
        </div>

        {copied && (
          <div className="text-center text-sm text-success-600">
            Address copied to clipboard!
          </div>
        )}

        <Button
          onClick={handleWalletAuth}
          loading={loading}
          className="w-full"
        >
          Authenticate with Platform
        </Button>
      </div>
    </Card>
  );
}