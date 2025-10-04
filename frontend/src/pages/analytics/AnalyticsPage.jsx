import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiService from '../../services/api';
import DataTable from '../../components/analytics/DataTable';
import Filters from '../../components/analytics/Filters';
import ExportTools from '../../components/analytics/ExportTools';
import { LineChartComponent, BarChartComponent } from '../../components/dashboard/Chart';
import Loading from '../../components/common/Loading';
import { BarChart3, TrendingUp, Download } from 'lucide-react';

export default function AnalyticsPage() {
  const [filters, setFilters] = useState({
    dateRange: { start: '', end: '' },
    opportunityType: '',
    minProfit: '',
    maxRisk: '',
    dex: ''
  });

  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['analytics', filters],
    queryFn: () => apiService.getAnalytics(filters),
    refetchInterval: 300000 // 5 minutes
  });

  const columns = [
    { key: 'timestamp', title: 'Time', render: (value) => new Date(value).toLocaleString() },
    { key: 'type', title: 'Type' },
    { key: 'profit', title: 'Profit (SOL)', render: (value) => `${value.toFixed(4)} SOL` },
    { key: 'dex', title: 'DEX' },
    { key: 'riskLevel', title: 'Risk' }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loading text="Loading analytics..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Comprehensive MEV performance analysis</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Filters 
            filters={filters} 
            onFiltersChange={setFilters}
          />
          <ExportTools 
            data={analyticsData?.opportunities || []}
            filename="mev-analytics"
          />
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LineChartComponent
          data={analyticsData?.profitOverTime || []}
          dataKey="profit"
          title="Profit Over Time"
          color="#10B981"
        />
        <BarChartComponent
          data={analyticsData?.opportunityTypes || []}
          dataKey="count"
          title="Opportunity Types"
          color="#3B82F6"
        />
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Opportunities</h3>
        </div>
        <DataTable
          data={analyticsData?.opportunities || []}
          columns={columns}
          pageSize={20}
          onRowClick={(row) => console.log('View opportunity:', row)}
        />
      </div>
    </div>
  );
}