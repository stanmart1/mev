import React from 'react';
import { ValidatorDashboard } from '@/components/validator';

export const ValidatorPage: React.FC = () => {
  // For now, we'll let users enter their validator pubkey manually
  // In the future, this could be stored in user profile or settings
  const defaultValidatorPubkey = '';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ValidatorDashboard defaultValidatorPubkey={defaultValidatorPubkey} />
      </div>
    </div>
  );
};