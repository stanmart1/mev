import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import LoginForm from '../../components/auth/LoginForm';
import RegisterForm from '../../components/auth/RegisterForm';
import PasswordRecoveryForm from '../../components/auth/PasswordRecoveryForm';

export default function AuthPage() {
  const [mode, setMode] = useState('login'); // 'login', 'register', 'recovery'
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleAuthSuccess = () => {
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary-600 dark:text-primary-400 mb-2">
            MEV Analytics
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Solana MEV Opportunities Platform
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        {mode === 'login' && (
          <LoginForm
            onSuccess={handleAuthSuccess}
            onSwitchToRegister={() => setMode('register')}
            onForgotPassword={() => setMode('recovery')}
          />
        )}
        
        {mode === 'register' && (
          <RegisterForm
            onSuccess={handleAuthSuccess}
            onSwitchToLogin={() => setMode('login')}
          />
        )}
        
        {mode === 'recovery' && (
          <PasswordRecoveryForm
            onBack={() => setMode('login')}
          />
        )}
      </div>

      <div className="mt-8 text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          © 2024 MEV Analytics Platform. All rights reserved.
        </p>
      </div>
    </div>
  );
}