import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Mail, Lock, Eye, EyeOff, Wallet } from 'lucide-react';
import Button from '../common/Button';
import Card from '../common/Card';
import { useAuth } from '../../contexts/AuthContext';
import solanaService from '../../services/solana';

export default function LoginForm({ onSuccess, onSwitchToRegister }) {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'wallet'
  
  const { login } = useAuth();
  const { publicKey, signMessage, connected } = useWallet();

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login({
      email: formData.email,
      password: formData.password
    });

    if (result.success) {
      onSuccess?.();
    } else {
      setError(result.error?.message || 'Login failed');
    }
    setLoading(false);
  };

  const handleWalletLogin = async () => {
    if (!connected || !publicKey || !signMessage) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const message = `Sign this message to authenticate with MEV Analytics Platform.\nTimestamp: ${Date.now()}`;
      const signature = await solanaService.signMessage(message, { signMessage });
      
      const result = await login({
        walletAddress: publicKey.toString(),
        signature: Array.from(signature),
        message
      });

      if (result.success) {
        onSuccess?.();
      } else {
        setError(result.error?.message || 'Wallet authentication failed');
      }
    } catch (error) {
      setError('Failed to sign message');
    }
    setLoading(false);
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError('');

    const result = await login({
      email: 'demo@mev-analytics.com',
      password: 'demo123'
    });

    if (result.success) {
      onSuccess?.();
    } else {
      setError('Demo login failed');
    }
    setLoading(false);
  };

  return (
    <Card className="w-full max-w-md mx-auto p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Sign In
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Access your MEV analytics dashboard
        </p>
      </div>

      {/* Login Method Toggle */}
      <div className="flex mb-6 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
        <button
          onClick={() => setLoginMethod('email')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            loginMethod === 'email'
              ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          <Mail className="w-4 h-4 inline mr-2" />
          Email
        </button>
        <button
          onClick={() => setLoginMethod('wallet')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            loginMethod === 'wallet'
              ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-600 dark:text-gray-400'
          }`}
        >
          <Wallet className="w-4 h-4 inline mr-2" />
          Wallet
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {loginMethod === 'email' ? (
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Enter your email"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                placeholder="Enter your password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button type="submit" loading={loading} className="w-full">
            Sign In
          </Button>
        </form>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
            Connect your Solana wallet to authenticate
          </p>
          
          <Button
            onClick={handleWalletLogin}
            loading={loading}
            disabled={!connected}
            className="w-full"
          >
            <Wallet className="w-4 h-4 mr-2" />
            Sign with Wallet
          </Button>
          
          {!connected && (
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              Please connect your wallet using the button in the top right
            </p>
          )}
        </div>
      )}

      <div className="mt-6 space-y-3">
        <Button
          variant="outline"
          onClick={handleDemoLogin}
          loading={loading}
          className="w-full"
        >
          Try Demo Account
        </Button>

        <div className="text-center">
          <button
            onClick={onSwitchToRegister}
            className="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400"
          >
            Don't have an account? Sign up
          </button>
        </div>
      </div>
    </Card>
  );
}