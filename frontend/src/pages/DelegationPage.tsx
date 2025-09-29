import React from 'react';
import { DelegationDashboard } from '@/components/delegation';
import { useAuthStore } from '@/stores/authStore';

export const DelegationPage: React.FC = () => {
  // Mock user balance - in real app this would come from wallet or API
  const userBalance = 10000; // SOL

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DelegationDashboard userBalance={userBalance} />
      </div>
    </div>
  );
};