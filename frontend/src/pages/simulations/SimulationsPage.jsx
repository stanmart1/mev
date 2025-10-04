import { useState } from 'react';
import { Play, Calculator, TrendingUp, AlertTriangle } from 'lucide-react';
import BundleBuilder from '../../components/mev/BundleBuilder';
import ProfitCalculator from '../../components/mev/ProfitCalculator';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/common/Card';

export default function SimulationsPage() {
  const [activeTab, setActiveTab] = useState('bundle');

  const tabs = [
    { id: 'bundle', label: 'Bundle Builder', icon: Play },
    { id: 'calculator', label: 'Profit Calculator', icon: Calculator },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">MEV Simulations</h1>
        <p className="text-gray-600 dark:text-gray-400">Build bundles and calculate profits before execution</p>
      </div>

      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {activeTab === 'bundle' && (
            <BundleBuilder onSimulate={(transactions) => console.log('Simulating:', transactions)} />
          )}
          {activeTab === 'calculator' && (
            <ProfitCalculator opportunity={{ profitMargin: 0.02 }} />
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Simulations Run</span>
                  <span className="font-semibold">247</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Avg Success Rate</span>
                  <span className="font-semibold text-green-600">73.2%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Best Profit</span>
                  <span className="font-semibold text-green-600">2.34 SOL</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Risk Factors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Network Congestion</span>
                  <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Medium</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Competition Level</span>
                  <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">High</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Market Volatility</span>
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Low</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}