import { useState } from 'react';
import { ChevronUp, ChevronDown, Star, Zap, Search } from 'lucide-react';

export default function Rankings({ validators = [], onValidatorClick, onFavorite }) {
  const [sortField, setSortField] = useState('rank');
  const [sortDirection, setSortDirection] = useState('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    jitoEnabled: false,
    minStake: '',
    maxCommission: ''
  });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredValidators = validators
    .filter(validator => {
      if (searchTerm && !validator.name?.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !validator.address.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      if (filters.jitoEnabled && !validator.isJitoEnabled) return false;
      if (filters.minStake && validator.totalStake < parseFloat(filters.minStake) * 1000000) return false;
      if (filters.maxCommission && validator.commission > parseFloat(filters.maxCommission)) return false;
      return true;
    })
    .sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      
      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronUp className="w-4 h-4 text-gray-400" />;
    return sortDirection === 'asc' ? 
      <ChevronUp className="w-4 h-4 text-blue-600" /> : 
      <ChevronDown className="w-4 h-4 text-blue-600" />;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      {/* Filters */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search validators..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md w-full lg:w-64"
            />
          </div>
          
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={filters.jitoEnabled}
                onChange={(e) => setFilters({...filters, jitoEnabled: e.target.checked})}
                className="mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Jito Enabled</span>
            </label>
            
            <input
              type="number"
              placeholder="Min Stake (M SOL)"
              value={filters.minStake}
              onChange={(e) => setFilters({...filters, minStake: e.target.value})}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm w-32"
            />
            
            <input
              type="number"
              placeholder="Max Commission %"
              value={filters.maxCommission}
              onChange={(e) => setFilters({...filters, maxCommission: e.target.value})}
              className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm w-32"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                <button onClick={() => handleSort('rank')} className="flex items-center space-x-1">
                  <span>Rank</span>
                  <SortIcon field="rank" />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Validator
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                <button onClick={() => handleSort('totalStake')} className="flex items-center space-x-1">
                  <span>Total Stake</span>
                  <SortIcon field="totalStake" />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                <button onClick={() => handleSort('mevEarnings24h')} className="flex items-center space-x-1">
                  <span>MEV (24h)</span>
                  <SortIcon field="mevEarnings24h" />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                <button onClick={() => handleSort('commission')} className="flex items-center space-x-1">
                  <span>Commission</span>
                  <SortIcon field="commission" />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                <button onClick={() => handleSort('apy')} className="flex items-center space-x-1">
                  <span>APY</span>
                  <SortIcon field="apy" />
                </button>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredValidators.map((validator) => (
              <tr 
                key={validator.address} 
                className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => onValidatorClick?.(validator)}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  #{validator.rank}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="flex items-center space-x-2">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {validator.name || `${validator.address.slice(0, 8)}...`}
                        </div>
                        {validator.isJitoEnabled && (
                          <Zap className="w-4 h-4 text-yellow-500" />
                        )}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                        {validator.address.slice(0, 12)}...
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {(validator.totalStake / 1000000).toFixed(1)}M SOL
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                  +{validator.mevEarnings24h.toFixed(3)} SOL
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                  {validator.commission}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-medium">
                  {validator.apy.toFixed(2)}%
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onFavorite?.(validator.address, !validator.isFavorited);
                    }}
                    className={`p-1 rounded ${validator.isFavorited ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}
                  >
                    <Star className={`w-4 h-4 ${validator.isFavorited ? 'fill-current' : ''}`} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}