import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Zap, Filter, SortDesc, Clock, TrendingUp, Play, Pause, RefreshCw, Settings, Download } from 'lucide-react';
import OpportunityCard from '../mev/OpportunityCard';
import Button from '../common/Button';
import { useMEV } from '../../hooks/useMEV';
import { useDemo } from '../../contexts/DemoContext';
import { formatTimeAgo } from '../../utils/formatters';

const ITEM_HEIGHT = 140;
const VISIBLE_ITEMS = 8;
const AUTO_REFRESH_INTERVAL = 3000;
const MAX_OPPORTUNITIES = 1000;

export default function LiveOpportunitiesFeed({ onSimulate, isActive = true }) {
  const { demoMode } = useDemo();
  const { opportunities, isLoadingOpportunities } = useMEV(demoMode);
  const [filters, setFilters] = useState({
    type: 'all',
    minProfit: 0,
    maxRisk: 10,
    dex: 'all',
    minConfidence: 0,
    tokenPair: ''
  });
  const [sortBy, setSortBy] = useState('timestamp');
  const [sortOrder, setSortOrder] = useState('desc');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [realDataError, setRealDataError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const listRef = useRef(null);

  // Filter and sort opportunities with performance optimization
  const filteredOpportunities = useMemo(() => {
    if (!Array.isArray(opportunities)) return [];
    let filtered = [...opportunities];

    // Apply filters
    if (filters.type !== 'all') {
      filtered = filtered.filter(opp => opp.opportunity_type === filters.type);
    }
    if (filters.minProfit > 0) {
      filtered = filtered.filter(opp => (opp.estimated_profit_sol || 0) >= filters.minProfit);
    }
    if (filters.maxRisk < 10) {
      filtered = filtered.filter(opp => (opp.execution_risk_score || 5) <= filters.maxRisk);
    }
    if (filters.dex !== 'all') {
      filtered = filtered.filter(opp => 
        opp.primary_dex === filters.dex || opp.secondary_dex === filters.dex
      );
    }
    if (filters.minConfidence > 0) {
      filtered = filtered.filter(opp => 
        (opp.confidence_score || 0) >= filters.minConfidence / 100
      );
    }
    if (filters.tokenPair) {
      const searchTerm = filters.tokenPair.toLowerCase();
      filtered = filtered.filter(opp => 
        (opp.token_symbol_a || '').toLowerCase().includes(searchTerm) ||
        (opp.token_symbol_b || '').toLowerCase().includes(searchTerm)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'profit':
          comparison = (b.estimated_profit_sol || 0) - (a.estimated_profit_sol || 0);
          break;
        case 'risk':
          comparison = (a.execution_risk_score || 5) - (b.execution_risk_score || 5);
          break;
        case 'confidence':
          comparison = (b.confidence_score || 0) - (a.confidence_score || 0);
          break;
        case 'volume':
          comparison = (b.volume_usd || 0) - (a.volume_usd || 0);
          break;
        case 'timestamp':
        default:
          comparison = new Date(b.detection_timestamp) - new Date(a.detection_timestamp);
      }
      return sortOrder === 'desc' ? comparison : -comparison;
    });

    // Limit for performance
    return filtered.slice(0, MAX_OPPORTUNITIES);
  }, [opportunities, filters, sortBy, sortOrder]);

  // Auto-refresh effect with performance optimization
  useEffect(() => {
    if (!autoRefresh || !isActive) return;
    
    const interval = setInterval(() => {
      setRefreshCount(prev => prev + 1);
      // Scroll to top on new data
      if (listRef.current) {
        listRef.current.scrollToItem(0, 'start');
      }
    }, AUTO_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [autoRefresh, isActive]);

  // Handle real data mode
  useEffect(() => {
    if (!demoMode) {
      // Real data mode - clear any demo errors
      setRealDataError(null);
    }
  }, [demoMode]);

  // Memoized handlers
  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSortChange = useCallback((newSortBy) => {
    if (newSortBy === sortBy) {
      setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  }, [sortBy]);

  const clearFilters = useCallback(() => {
    setFilters({
      type: 'all',
      minProfit: 0,
      maxRisk: 10,
      dex: 'all',
      minConfidence: 0,
      tokenPair: ''
    });
  }, []);

  const exportData = useCallback(() => {
    const dataStr = JSON.stringify(filteredOpportunities, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mev-opportunities-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [filteredOpportunities]);

  const OpportunityRow = ({ index, style }) => {
    const opportunity = filteredOpportunities[index];
    return (
      <div style={style} className="px-2 py-1">
        <div className="animate-fadeIn">
          <OpportunityCard
            opportunity={opportunity}
            onSimulate={onSimulate}
            compact
          />
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse live-indicator"></div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Live MEV Feed
            </h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ({filteredOpportunities.length} active)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? 'text-green-600' : 'text-gray-400'}
            >
              <Clock className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Advanced Filters */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                Filters
                {Object.values(filters).some(v => v !== 'all' && v !== 0 && v !== '') && (
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-gray-500"
              >
                Clear
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={exportData}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`flex items-center gap-2 ${autoRefresh ? 'text-green-600' : 'text-gray-400'}`}
              >
                {autoRefresh ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {autoRefresh ? 'Pause' : 'Resume'}
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <select
                value={filters.type}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800"
              >
                <option value="all">All Types</option>
                <option value="arbitrage">Arbitrage</option>
                <option value="liquidation">Liquidation</option>
                <option value="sandwich">Sandwich</option>
              </select>

              <select
                value={filters.dex}
                onChange={(e) => handleFilterChange('dex', e.target.value)}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800"
              >
                <option value="all">All DEXs</option>
                <option value="raydium">Raydium</option>
                <option value="orca">Orca</option>
                <option value="serum">Serum</option>
                <option value="jupiter">Jupiter</option>
              </select>

              <input
                type="number"
                placeholder="Min Profit (SOL)"
                value={filters.minProfit || ''}
                onChange={(e) => handleFilterChange('minProfit', parseFloat(e.target.value) || 0)}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800"
                step="0.001"
              />

              <input
                type="range"
                min="1"
                max="10"
                value={filters.maxRisk}
                onChange={(e) => handleFilterChange('maxRisk', parseInt(e.target.value))}
                className="text-sm"
                title={`Max Risk: ${filters.maxRisk}/10`}
              />

              <input
                type="number"
                placeholder="Min Confidence %"
                value={filters.minConfidence || ''}
                onChange={(e) => handleFilterChange('minConfidence', parseInt(e.target.value) || 0)}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800"
                min="0"
                max="100"
              />

              <input
                type="text"
                placeholder="Token pair..."
                value={filters.tokenPair}
                onChange={(e) => handleFilterChange('tokenPair', e.target.value)}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800"
              />
            </div>
          )}

          {/* Sort Options */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Sort by:</span>
            {['timestamp', 'profit', 'risk', 'confidence', 'volume'].map((option) => (
              <Button
                key={option}
                variant={sortBy === option ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => handleSortChange(option)}
                className="flex items-center gap-1 capitalize"
              >
                {option}
                {sortBy === option && (
                  <SortDesc className={`w-3 h-3 ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
                )}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Opportunities List */}
      <div className="p-2">
        {isLoadingOpportunities ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-sm text-gray-600">Loading opportunities...</span>
          </div>
        ) : filteredOpportunities.length > 0 ? (
          <List
            ref={listRef}
            height={ITEM_HEIGHT * Math.min(VISIBLE_ITEMS, filteredOpportunities.length)}
            itemCount={filteredOpportunities.length}
            itemSize={ITEM_HEIGHT}
            itemData={filteredOpportunities}
            overscanCount={5}
            className="scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600"
          >
            {OpportunityRow}
          </List>
        ) : (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No opportunities match your filters</p>
            <p className="text-sm">Try adjusting your filter criteria</p>
          </div>
        )}
      </div>

      {/* Enhanced Footer Stats */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-b-lg border-t border-gray-200 dark:border-gray-600">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Total Opportunities</span>
            <p className="font-semibold text-gray-900 dark:text-white">
              {filteredOpportunities.length.toLocaleString()}
            </p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Avg Profit</span>
            <p className="font-semibold text-green-600">
              {filteredOpportunities.length > 0 
                ? (filteredOpportunities.reduce((sum, opp) => sum + (opp.estimated_profit_sol || 0), 0) / filteredOpportunities.length).toFixed(4)
                : '0.0000'} SOL
            </p>
          </div>
          <div>
            <span className="text-gray-500 dark:text-gray-400">Total Volume</span>
            <p className="font-semibold text-blue-600">
              ${filteredOpportunities.reduce((sum, opp) => sum + (opp.volume_usd || 0), 0).toLocaleString()}
            </p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-gray-500 dark:text-gray-400">Status</span>
              <div className={`flex items-center gap-2 ${autoRefresh ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-2 h-2 rounded-full ${autoRefresh ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
                <span className="font-medium">{autoRefresh ? 'Live' : 'Paused'}</span>
              </div>
            </div>
            <div className="text-xs text-gray-400">
              Refreshes: {refreshCount}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}