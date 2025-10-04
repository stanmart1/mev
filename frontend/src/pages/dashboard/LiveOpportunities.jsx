import { useState } from 'react';
import { Activity, Filter, Download, Settings } from 'lucide-react';
import LiveOpportunitiesFeed from '../../components/dashboard/LiveOpportunitiesFeed';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';

export default function LiveOpportunities() {
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);

  const handleSimulate = (opportunity) => {
    setSelectedOpportunity(opportunity);
    // Navigate to simulation page or open modal
    console.log('Simulating opportunity:', opportunity);
  };

  const stats = [
    { label: 'Active Opportunities', value: '247', change: '+12%', color: 'text-blue-600' },
    { label: 'Avg Profit/Hour', value: '2.34 SOL', change: '+8%', color: 'text-green-600' },
    { label: 'Success Rate', value: '73.2%', change: '+2.1%', color: 'text-purple-600' },
    { label: 'Competition Level', value: 'Medium', change: 'Stable', color: 'text-orange-600' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Live MEV Opportunities
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Real-time arbitrage, liquidation, and sandwich opportunities
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="ghost" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</p>
                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-green-600">{stat.change}</p>
                <Activity className="w-4 h-4 text-gray-400 mt-1" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Live Feed */}
      <LiveOpportunitiesFeed onSimulate={handleSimulate} />
    </div>
  );
}