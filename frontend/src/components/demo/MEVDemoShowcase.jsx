import { useState, useEffect } from 'react';
import { Play, Pause, Settings, Database, Wifi, WifiOff } from 'lucide-react';
import LiveOpportunitiesFeed from '../dashboard/LiveOpportunitiesFeed';
import Button from '../common/Button';
import Card from '../common/Card';
import { useDemo } from '../../contexts/DemoContext';

export default function MEVDemoShowcase() {
  const { demoMode, setDemoMode } = useDemo();
  const [isRunning, setIsRunning] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState('connected');

  const stats = {
    demo: {
      totalOpportunities: 1247,
      avgProfit: '2.34 SOL',
      successRate: '73.2%',
      activeValidators: 1834
    },
    real: {
      totalOpportunities: 0,
      avgProfit: '0.00 SOL',
      successRate: '0.0%',
      activeValidators: 0
    }
  };

  const currentStats = demoMode ? stats.demo : stats.real;

  useEffect(() => {
    if (!demoMode) {
      setConnectionStatus('connected'); // Default to connected for real data
    } else {
      setConnectionStatus('connected');
    }
  }, [demoMode]);

  const handleSimulate = (opportunity) => {
    console.log('Simulating opportunity:', opportunity);
  };

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              MEV Analytics Demo
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Comprehensive showcase of all MEV detection and analysis features
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              connectionStatus === 'connected' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : connectionStatus === 'connecting'
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}>
              {connectionStatus === 'connected' ? (
                <Wifi className="w-4 h-4" />
              ) : (
                <WifiOff className="w-4 h-4" />
              )}
              {connectionStatus === 'connected' ? 'Live' : 
               connectionStatus === 'connecting' ? 'Connecting...' : 'Offline'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400">Mode</p>
            <div className="flex items-center gap-2 mt-1">
              <Database className="w-4 h-4 text-blue-600" />
              <span className="font-medium">{demoMode ? 'Demo Data' : 'Real API'}</span>
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400">Opportunities</p>
            <p className="font-semibold text-lg">{currentStats.totalOpportunities.toLocaleString()}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400">Avg Profit</p>
            <p className="font-semibold text-lg text-green-600">{currentStats.avgProfit}</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
            <p className="text-xs text-gray-600 dark:text-gray-400">Success Rate</p>
            <p className="font-semibold text-lg text-blue-600">{currentStats.successRate}</p>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant={demoMode ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setDemoMode(true)}
              className="flex items-center gap-2"
            >
              <Database className="w-4 h-4" />
              Demo Mode
            </Button>
            <Button
              variant={!demoMode ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setDemoMode(false)}
              className="flex items-center gap-2"
            >
              <Wifi className="w-4 h-4" />
              Real Data
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsRunning(!isRunning)}
              className={`flex items-center gap-2 ${isRunning ? 'text-green-600' : 'text-gray-400'}`}
            >
              {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isRunning ? 'Pause' : 'Resume'}
            </Button>
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <LiveOpportunitiesFeed 
            onSimulate={handleSimulate}
            isActive={isRunning}
          />
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="font-semibold mb-3">🎯 Key Features</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Real-time Updates</span>
                <span className={`w-2 h-2 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
              </div>
              <div className="flex items-center justify-between">
                <span>Advanced Filtering</span>
                <span className="text-blue-600">6 filters</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Virtualized Lists</span>
                <span className="text-green-600">1000+ items</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Export Data</span>
                <span className="text-purple-600">JSON/CSV</span>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold mb-3">📊 Opportunity Types</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                  <span>Arbitrage</span>
                </div>
                <span className="font-medium">67%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
                  <span>Liquidation</span>
                </div>
                <span className="font-medium">23%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-orange-500 rounded-full"></span>
                  <span>Sandwich</span>
                </div>
                <span className="font-medium">10%</span>
              </div>
            </div>
          </Card>

          {!demoMode && connectionStatus === 'disconnected' && (
            <Card className="p-4 border-red-200 bg-red-50 dark:bg-red-900/20">
              <h3 className="font-semibold text-red-800 dark:text-red-200 mb-2">
                ⚠️ Connection Failed
              </h3>
              <p className="text-sm text-red-600 dark:text-red-300 mb-3">
                Unable to connect to real MEV data API. Check backend status.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setDemoMode(true)}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                Switch to Demo Mode
              </Button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}