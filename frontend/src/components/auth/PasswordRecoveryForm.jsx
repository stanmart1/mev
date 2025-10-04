import React, { useState } from 'react';
import { Mail, ArrowLeft } from 'lucide-react';
import Button from '../common/Button';
import Card from '../common/Card';
import apiService from '../../services/api';

export default function PasswordRecoveryForm({ onBack }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await apiService.client.post('/auth/forgot-password', { email });
      if (response.success) {
        setSuccess(true);
      } else {
        setError(response.error?.message || 'Failed to send reset email');
      }
    } catch (error) {
      setError('Failed to send reset email. Please try again.');
    }
    setLoading(false);
  };

  if (success) {
    return (
      <Card className="w-full max-w-md mx-auto p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Check Your Email
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            We've sent a password reset link to <strong>{email}</strong>
          </p>
          <Button onClick={onBack} variant="outline" className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto p-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Reset Password
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Enter your email to receive a reset link
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Enter your email"
            />
          </div>
        </div>

        <Button type="submit" loading={loading} className="w-full">
          Send Reset Link
        </Button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={onBack}
          className="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400 flex items-center justify-center mx-auto"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Login
        </button>
      </div>
    </Card>
  );
}