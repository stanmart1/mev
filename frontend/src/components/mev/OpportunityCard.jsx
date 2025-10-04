import React from 'react';
import { Clock, TrendingUp, AlertTriangle, Zap, Target, Layers, BarChart3 } from 'lucide-react';
import Card from '../common/Card';
import Button from '../common/Button';

const opportunityTypes = {
  arbitrage: { 
    color: 'text-blue-600', 
    bg: 'bg-blue-100 dark:bg-blue-900', 
    badge: 'bg-blue-500 text-white',
    icon: TrendingUp,
    label: 'Arbitrage'
  },
  liquidation: { 
    color: 'text-purple-600', 
    bg: 'bg-purple-100 dark:bg-purple-900', 
    badge: 'bg-purple-500 text-white',
    icon: AlertTriangle,
    label: 'Liquidation'
  },
  sandwich: { 
    color: 'text-orange-600', 
    bg: 'bg-orange-100 dark:bg-orange-900', 
    badge: 'bg-orange-500 text-white',
    icon: Target,
    label: 'Sandwich'
  },
};

const riskLevels = {
  1: { label: 'Very Low', color: 'text-green-600', bg: 'bg-green-100', indicator: 'bg-green-500' },
  2: { label: 'Low', color: 'text-green-600', bg: 'bg-green-100', indicator: 'bg-green-500' },
  3: { label: 'Low', color: 'text-green-600', bg: 'bg-green-100', indicator: 'bg-green-500' },
  4: { label: 'Medium', color: 'text-yellow-600', bg: 'bg-yellow-100', indicator: 'bg-yellow-500' },
  5: { label: 'Medium', color: 'text-yellow-600', bg: 'bg-yellow-100', indicator: 'bg-yellow-500' },
  6: { label: 'Medium', color: 'text-yellow-600', bg: 'bg-yellow-100', indicator: 'bg-yellow-500' },
  7: { label: 'High', color: 'text-red-600', bg: 'bg-red-100', indicator: 'bg-red-500' },
  8: { label: 'High', color: 'text-red-600', bg: 'bg-red-100', indicator: 'bg-red-500' },
  9: { label: 'Very High', color: 'text-red-600', bg: 'bg-red-100', indicator: 'bg-red-500' },
  10: { label: 'Extreme', color: 'text-red-600', bg: 'bg-red-100', indicator: 'bg-red-500' },
};

const dexLogos = {
  raydium: '🌊',
  orca: '🐋',
  serum: '⚡',
  jupiter: '🪐',
  saber: '⚔️'
};

const tokenLogos = {
  SOL: '◎',
  USDC: '$',
  USDT: '₮',
  RAY: '🌊',
  SRM: '⚡',
  ORCA: '🐋'
};

export default function OpportunityCard({ opportunity, onSimulate, compact = false }) {
  const typeConfig = opportunityTypes[opportunity.opportunity_type] || opportunityTypes.arbitrage;
  const TypeIcon = typeConfig.icon;
  const riskConfig = riskLevels[opportunity.execution_risk_score] || riskLevels[5];
  const tokenA = opportunity.token_symbol_a || opportunity.tokenA || opportunity.token_a || 'SOL';
  const tokenB = opportunity.token_symbol_b || opportunity.tokenB || opportunity.token_b || 'USDC';

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now - time;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  if (compact) {
    return (
      <div className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200 hover:shadow-sm">
        <div className="flex items-center justify-end text-xs text-gray-500 whitespace-nowrap mb-2">
          <Clock className="w-3 h-3 mr-1" />
          {formatTimeAgo(opportunity.detection_timestamp)}
        </div>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className={`px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap flex-shrink-0 ${typeConfig.badge}`}>
            {typeConfig.label}
          </span>
          <div className="flex items-center gap-1">
            <span className="text-sm flex-shrink-0">
              {tokenLogos[tokenA] || '🪙'}
            </span>
            <span className="text-xs font-medium">
              {tokenA}
            </span>
            <span className="text-xs text-gray-400">/</span>
            <span className="text-sm flex-shrink-0">
              {tokenLogos[tokenB] || '🪙'}
            </span>
            <span className="text-xs font-medium">
              {tokenB}
            </span>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1">
              <span className="text-sm font-semibold text-green-600 whitespace-nowrap">
                +{parseFloat(opportunity.estimated_profit_sol || 0).toFixed(4)} SOL
              </span>
              {opportunity.confidence_score && (
                <span className="text-xs text-gray-500">
                  ({(opportunity.confidence_score * 100).toFixed(0)}%)
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${riskConfig.indicator}`}></div>
              <span className={`text-xs whitespace-nowrap ${riskConfig.color}`}>
                {riskConfig.label}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <span className="text-sm" title={opportunity.primary_dex}>
              {dexLogos[opportunity.primary_dex] || '🔄'}
            </span>
            {opportunity.secondary_dex && (
              <>
                <span className="text-xs text-gray-400">→</span>
                <span className="text-sm" title={opportunity.secondary_dex}>
                  {dexLogos[opportunity.secondary_dex] || '🔄'}
                </span>
              </>
            )}
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button
            variant="primary"
            size="sm"
            onClick={() => onSimulate?.(opportunity)}
            className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700"
          >
            <Layers className="w-3 h-3 mr-1" />
            Simulate Bundle
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <div className="flex items-center justify-end text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap mb-2">
        <Clock className="w-4 h-4 mr-1" />
        {formatTimeAgo(opportunity.detection_timestamp)}
      </div>
      <div className="flex items-start gap-3 mb-4">
        <span className={`px-3 py-1 text-sm font-medium rounded-full whitespace-nowrap flex-shrink-0 ${typeConfig.badge}`}>
          {typeConfig.label}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {tokenA}/{tokenB}
            </h3>
            <div className="flex items-center gap-1 flex-shrink-0">
              <span className="text-lg">
                {tokenLogos[tokenA] || '🪙'}
              </span>
              <span className="text-lg">
                {tokenLogos[tokenB] || '🪙'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap" title={opportunity.primary_dex}>
              {dexLogos[opportunity.primary_dex] || '🔄'} {opportunity.primary_dex}
            </span>
            {opportunity.secondary_dex && (
              <>
                <span className="text-xs text-gray-400">→</span>
                <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap" title={opportunity.secondary_dex}>
                  {dexLogos[opportunity.secondary_dex] || '🔄'} {opportunity.secondary_dex}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="min-w-0">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Token Pair</p>
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {tokenA}/{tokenB}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Volume</p>
          <p className="font-medium text-gray-900 dark:text-gray-100">
            ${parseFloat(opportunity.volume_usd || 0).toFixed(2)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div className="min-w-0">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Estimated Profit</p>
          <p className="font-bold text-green-600">
            {parseFloat(opportunity.estimated_profit_sol || 0).toFixed(6)} SOL
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <p className="text-xs text-gray-500 whitespace-nowrap">
              ${parseFloat(opportunity.estimated_profit_usd || 0).toFixed(2)}
            </p>
            {opportunity.confidence_score && (
              <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded whitespace-nowrap">
                {(opportunity.confidence_score * 100).toFixed(0)}% confidence
              </span>
            )}
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Risk Level</p>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${riskConfig.indicator}`}></div>
            <p className={`font-medium ${riskConfig.color}`}>
              {riskConfig.label}
            </p>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Score: {opportunity.execution_risk_score}/10
          </p>
        </div>
      </div>

      {opportunity.profit_percentage && (
        <div className="mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Profit Margin</p>
          <p className="font-medium text-green-600">
            {parseFloat(opportunity.profit_percentage).toFixed(2)}%
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-2">
        <Button
          variant="primary"
          size="sm"
          onClick={() => onSimulate?.(opportunity)}
          className="flex-1"
        >
          Simulate Bundle
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 sm:flex-initial"
        >
          Details
        </Button>
      </div>
    </Card>
  );
}