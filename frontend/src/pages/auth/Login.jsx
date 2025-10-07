import React, { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import WalletConnect from '../../components/auth/WalletConnect';

export default function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [retryAfter, setRetryAfter] = useState(0);
  
  const { login, walletLogin, isAuthenticated, isLoading } = useAuth();

  React.useEffect(() => {
    let timer;
    if (retryAfter > 0) {
      timer = setInterval(() => {
        setRetryAfter(prev => {
          if (prev <= 1) {
            setError('');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [retryAfter]);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setRetryAfter(0);
    
    try {
      const result = await login(formData);
      if (!result.success) {
        const errorMsg = result.error || 'Login failed. Please check your credentials.';
        const retrySeconds = result.retryAfter;
        
        if (retrySeconds) {
          setRetryAfter(retrySeconds);
          setError(`Too many login attempts. Please wait ${retrySeconds} seconds before trying again.`);
        } else {
          setError(errorMsg);
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again.');
    }
  };

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleDemoLogin = () => {
    setFormData({
      email: 'demo@mev-analytics.com',
      password: 'demo123'
    });
  };

  const handleWalletAuth = async (walletData) => {
    setError('');
    try {
      const result = await walletLogin(walletData);
      if (!result.success) {
        setError(result.error || 'Wallet authentication failed');
      }
    } catch (error) {
      console.error('Wallet auth error:', error);
      setError('Wallet authentication failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-gray-100">
            MEV Analytics Platform
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            Sign in to access real-time MEV opportunities
          </p>
        </div>
        
        <Card>
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded-md">
                <p className="font-medium">{error}</p>
                {retryAfter > 0 && (
                  <p className="mt-2 text-lg font-bold">
                    ⏱️ {retryAfter} seconds
                  </p>
                )}
              </div>
            )}
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email address
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="input-field pl-10"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="input-field pl-10 pr-10"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <Button
                type="submit"
                className="w-full"
                loading={isLoading}
                disabled={isLoading || retryAfter > 0}
              >
                {retryAfter > 0 ? `Wait ${retryAfter}s` : 'Sign in'}
              </Button>
            </div>

            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={handleDemoLogin}
                className="text-primary-600 hover:text-primary-500"
              >
                Use demo credentials
              </button>
              <Link
                to="/signup"
                className="text-primary-600 hover:text-primary-500 font-medium"
              >
                Create account
              </Link>
            </div>
          </form>
        </Card>
        
        <div className="mt-8">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                Or connect with wallet
              </span>
            </div>
          </div>
          
          <div className="mt-6">
            <WalletConnect onWalletAuth={handleWalletAuth} />
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 dark:text-gray-400">
          <Link to="/api-docs" className="hover:text-primary-600 dark:hover:text-primary-400">
            API Documentation
          </Link>
          <span className="mx-2">•</span>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-primary-600 dark:hover:text-primary-400">
            GitHub
          </a>
          <span className="mx-2">•</span>
          <span>© 2024 MEV Analytics</span>
        </div>
      </div>
    </div>
  );
}