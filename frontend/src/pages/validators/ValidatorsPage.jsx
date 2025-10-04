import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiService from '../../services/api';
import Rankings from '../../components/validators/Rankings';
import ValidatorCard from '../../components/validators/ValidatorCard';
import Loading from '../../components/common/Loading';
import { Users, Star } from 'lucide-react';

export default function ValidatorsPage() {
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'
  const [favorites, setFavorites] = useState(new Set());

  const { data: validators = [], isLoading } = useQuery({
    queryKey: ['validators'],
    queryFn: () => apiService.getValidators(),
    refetchInterval: 60000
  });

  const handleFavorite = (address, isFavorited) => {
    const newFavorites = new Set(favorites);
    if (isFavorited) {
      newFavorites.add(address);
    } else {
      newFavorites.delete(address);
    }
    setFavorites(newFavorites);
  };

  const validatorsWithFavorites = validators.map(validator => ({
    ...validator,
    isFavorited: favorites.has(validator.address)
  }));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loading text="Loading validators..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Validator Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400">Performance metrics and MEV earnings</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded text-sm font-medium ${
                viewMode === 'table' 
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow' 
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Table
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1 rounded text-sm font-medium ${
                viewMode === 'cards' 
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow' 
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Cards
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'table' ? (
        <Rankings 
          validators={validatorsWithFavorites}
          onValidatorClick={(validator) => console.log('View validator:', validator)}
          onFavorite={handleFavorite}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {validatorsWithFavorites.map((validator) => (
            <ValidatorCard 
              key={validator.address}
              validator={validator}
              onFavorite={handleFavorite}
            />
          ))}
        </div>
      )}

      {validators.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No validators found</h3>
          <p className="text-gray-600 dark:text-gray-400">Validator data will appear here once available.</p>
        </div>
      )}
    </div>
  );
}