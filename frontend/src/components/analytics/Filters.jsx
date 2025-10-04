import { useState } from 'react';
import { Filter, X, Calendar } from 'lucide-react';
import Button from '../common/Button';

export default function Filters({ filters, onFiltersChange, onReset }) {
  const [isOpen, setIsOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);

  const handleApply = () => {
    onFiltersChange(localFilters);
    setIsOpen(false);
  };

  const handleReset = () => {
    const resetFilters = {
      dateRange: { start: '', end: '' },
      opportunityType: '',
      minProfit: '',
      maxRisk: '',
      dex: '',
      validator: ''
    };
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
    onReset?.();
  };

  const updateFilter = (key, value) => {
    setLocalFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const activeFiltersCount = Object.values(filters).filter(value => {
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(v => v !== '');
    }
    return value !== '';
  }).length;

  return (
    <div className="relative">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="outline"
        className="relative"
      >
        <Filter className="w-4 h-4 mr-2" />
        Filters
        {activeFiltersCount > 0 && (
          <span className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {activeFiltersCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Date Range
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="date"
                      value={localFilters.dateRange?.start || ''}
                      onChange={(e) => updateFilter('dateRange', { 
                        ...localFilters.dateRange, 
                        start: e.target.value 
                      })}
                      className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm"
                    />
                  </div>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="date"
                      value={localFilters.dateRange?.end || ''}
                      onChange={(e) => updateFilter('dateRange', { 
                        ...localFilters.dateRange, 
                        end: e.target.value 
                      })}
                      className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Opportunity Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Opportunity Type
                </label>
                <select
                  value={localFilters.opportunityType || ''}
                  onChange={(e) => updateFilter('opportunityType', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm"
                >
                  <option value="">All Types</option>
                  <option value="arbitrage">Arbitrage</option>
                  <option value="liquidation">Liquidation</option>
                  <option value="sandwich">Sandwich</option>
                </select>
              </div>

              {/* Min Profit */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Minimum Profit (SOL)
                </label>
                <input
                  type="number"
                  value={localFilters.minProfit || ''}
                  onChange={(e) => updateFilter('minProfit', e.target.value)}
                  placeholder="0.001"
                  step="0.001"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm"
                />
              </div>

              {/* Max Risk */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Maximum Risk Level
                </label>
                <select
                  value={localFilters.maxRisk || ''}
                  onChange={(e) => updateFilter('maxRisk', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm"
                >
                  <option value="">Any Risk</option>
                  <option value="low">Low Risk</option>
                  <option value="medium">Medium Risk</option>
                  <option value="high">High Risk</option>
                </select>
              </div>

              {/* DEX */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  DEX
                </label>
                <select
                  value={localFilters.dex || ''}
                  onChange={(e) => updateFilter('dex', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm"
                >
                  <option value="">All DEXs</option>
                  <option value="raydium">Raydium</option>
                  <option value="orca">Orca</option>
                  <option value="serum">Serum</option>
                  <option value="jupiter">Jupiter</option>
                </select>
              </div>
            </div>

            <div className="flex space-x-2 mt-6">
              <Button onClick={handleApply} className="flex-1">
                Apply Filters
              </Button>
              <Button onClick={handleReset} variant="outline">
                Reset
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}