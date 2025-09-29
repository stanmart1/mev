import React, { useState } from 'react';
import { MEVEarningsCard } from './MEVEarningsCard';
import { HistoricalPerformanceChart } from './HistoricalPerformanceChart';
import { EpochPerformanceComparison } from './EpochPerformanceComparison';
import { JitoStatusIndicators } from './JitoStatusIndicators';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { 
  Search, 
  Settings, 
  Download, 
  Share2, 
  RefreshCw,
  Activity,
  TrendingUp,
  Zap,
  BarChart3
} from 'lucide-react';

interface ValidatorDashboardProps {
  defaultValidatorPubkey?: string;
  className?: string;
}

export const ValidatorDashboard: React.FC<ValidatorDashboardProps> = ({
  defaultValidatorPubkey = '',
  className = ''
}) => {
  const [validatorPubkey, setValidatorPubkey] = useState(defaultValidatorPubkey);
  const [searchInput, setSearchInput] = useState(defaultValidatorPubkey);
  const [isValidPubkey, setIsValidPubkey] = useState(!!defaultValidatorPubkey);
  const [refreshKey, setRefreshKey] = useState(0);

  const validatePubkey = (pubkey: string): boolean => {
    // Basic validation for Solana public key (base58, 32 bytes = 44 characters)
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{43,44}$/;
    return base58Regex.test(pubkey);
  };

  const handleSearch = (): void => {
    const trimmedInput = searchInput.trim();
    if (validatePubkey(trimmedInput)) {
      setValidatorPubkey(trimmedInput);
      setIsValidPubkey(true);
    } else {
      setIsValidPubkey(false);
    }
  };

  const handleInputChange = (value: string): void => {
    setSearchInput(value);
    if (value.trim() === '') {
      setIsValidPubkey(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const refreshDashboard = (): void => {
    setRefreshKey(prev => prev + 1);
  };

  const exportData = (): void => {
    // Implementation for data export
    console.log('Exporting validator data...');
  };

  const shareDashboard = (): void => {
    if (navigator.share && isValidPubkey) {
      navigator.share({
        title: 'MEV Validator Dashboard',
        text: `Check out this validator's MEV performance: ${validatorPubkey}`,
        url: window.location.href
      });
    } else if (isValidPubkey) {
      // Fallback to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Section */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-6 w-6 text-blue-600" />
                MEV Validator Dashboard
              </CardTitle>
              <CardDescription>
                Comprehensive MEV analytics and performance monitoring for Solana validators
              </CardDescription>
            </div>
            
            {isValidPubkey && (
              <div className="flex items-center gap-2">
                <Button onClick={refreshDashboard} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button onClick={exportData} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button onClick={shareDashboard} variant="outline" size="sm">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Validator Search */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Enter validator public key (e.g., 7Np41oeYqPefeNQEHSv1UDhYrehxin3NStELsSKCT4K2)"
                value={searchInput}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyPress={handleKeyPress}
                className={`${!isValidPubkey && searchInput.length > 0 ? 'border-red-300 focus:border-red-500' : ''}`}
              />
              {!isValidPubkey && searchInput.length > 0 && (
                <p className="text-sm text-red-500 mt-1">
                  Please enter a valid Solana validator public key
                </p>
              )}
            </div>
            <Button onClick={handleSearch} disabled={!searchInput.trim()}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
          
          {/* Current Validator Info */}
          {isValidPubkey && (
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Monitoring Validator
                  </p>
                  <p className="text-xs font-mono text-blue-700 dark:text-blue-300 break-all">
                    {validatorPubkey}
                  </p>
                </div>
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                  Active
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dashboard Content */}
      {isValidPubkey ? (
        <div className="space-y-6">
          {/* Top Row - Key Metrics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MEVEarningsCard 
              key={`earnings-${refreshKey}`}
              validatorId={validatorPubkey} 
            />
            <JitoStatusIndicators 
              key={`jito-${refreshKey}`}
              validatorPubkey={validatorPubkey} 
            />
          </div>

          {/* Middle Row - Historical Performance */}
          <HistoricalPerformanceChart 
            key={`historical-${refreshKey}`}
            validatorPubkey={validatorPubkey} 
          />

          {/* Bottom Row - Detailed Comparisons */}
          <EpochPerformanceComparison 
            key={`epoch-${refreshKey}`}
            validatorPubkey={validatorPubkey} 
          />

          {/* Dashboard Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-8 w-8 text-green-600 bg-green-100 p-2 rounded-lg" />
                <div>
                  <p className="font-medium">Performance Analytics</p>
                  <p className="text-sm text-gray-600">Real-time MEV metrics and trends</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <Zap className="h-8 w-8 text-purple-600 bg-purple-100 p-2 rounded-lg" />
                <div>
                  <p className="font-medium">Jito Integration</p>
                  <p className="text-sm text-gray-600">MEV auction and bundle tracking</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-blue-600 bg-blue-100 p-2 rounded-lg" />
                <div>
                  <p className="font-medium">Network Comparison</p>
                  <p className="text-sm text-gray-600">Benchmark against peers</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        /* Empty State */
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Activity className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No Validator Selected
            </h3>
            <p className="text-gray-500 text-center mb-6 max-w-md">
              Enter a Solana validator public key above to view detailed MEV analytics, 
              performance metrics, and Jito integration status.
            </p>
            
            {/* Example validators for testing */}
            <div className="space-y-2">
              <p className="text-sm text-gray-600 font-medium">Example validators:</p>
              <div className="space-y-1">
                {[
                  '7Np41oeYqPefeNQEHSv1UDhYrehxin3NStELsSKCT4K2',
                  'Fe7pBsWk1J7Lt4Le6Z2dXMF2fzx5FqWxfs6bBJF5f6zx',
                  '9QU2QSxhb24FUX3Tu2FpczXjpK3VYrvRudywSBdh8XAK'
                ].map((pubkey, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setSearchInput(pubkey);
                      setValidatorPubkey(pubkey);
                      setIsValidPubkey(true);
                    }}
                    className="block text-xs font-mono text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {pubkey}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Footer Information */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-4">
              <span>MEV Dashboard v2.0</span>
              <Badge variant="outline" className="text-xs">
                Real-time
              </Badge>
            </div>
            <div className="flex items-center gap-4">
              <span>Updates every 30 seconds</span>
              <span>•</span>
              <span>Powered by Jito MEV</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};