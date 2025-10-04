import { useState } from 'react';
import { useMEV } from '../../hooks/useMEV';
import OpportunityCard from '../../components/mev/OpportunityCard';
import Filters from '../../components/analytics/Filters';
import Loading from '../../components/common/Loading';
import { TrendingUp, Zap, AlertTriangle } from 'lucide-react';

export default function OpportunitiesPage() {
  const { opportunities, isLoadingOpportunities } = useMEV();
  const [filters, setFilters] = useState({
    dateRange: { start: '', end: '' },
    opportunityType: '',
    minProfit: '',
    maxRisk: '',
    dex: ''
  });

  const filteredOpportunities = opportunities.filter(opp => {
    if (filters.opportunityType && opp.type !== filters.opportunityType) return false;
    if (filters.minProfit && opp.estimatedProfit < parseFloat(filters.minProfit)) return false;
    if (filters.maxRisk && opp.riskLevel === 'high' && filters.maxRisk === 'medium') return false;
    if (filters.dex && !opp.dexes?.includes(filters.dex)) return false;
    return true;
  });

  if (isLoadingOpportunities) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loading text="Loading opportunities..." />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">MEV Opportunities</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Real-time arbitrage and liquidation opportunities</p>
        </div>
        <div className="flex-shrink-0">
          <Filters 
            filters={filters} 
            onFiltersChange={setFilters}
            onReset={() => setFilters({
              dateRange: { start: '', end: '' },
              opportunityType: '',
              minProfit: '',
              maxRisk: '',
              dex: ''
            })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredOpportunities.map((opportunity) => (
          <OpportunityCard 
            key={opportunity.id} 
            opportunity={opportunity}
            onSimulate={(opp) => console.log('Simulate:', opp)}
          />
        ))}
      </div>

      {filteredOpportunities.length === 0 && (
        <div className="text-center py-12">
          <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No opportunities found</h3>
          <p className="text-gray-600 dark:text-gray-400">Try adjusting your filters or check back later.</p>
        </div>
      )}
    </div>
  );
}