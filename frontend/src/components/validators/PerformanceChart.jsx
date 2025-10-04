import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

export default function PerformanceChart({ data, type = 'line', title, dataKey = 'value' }) {
  const formatTooltip = (value, name) => {
    if (name === 'mevEarnings') return [`${value.toFixed(4)} SOL`, 'MEV Earnings'];
    if (name === 'stake') return [`${(value / 1000000).toFixed(1)}M SOL`, 'Total Stake'];
    if (name === 'apy') return [`${value.toFixed(2)}%`, 'APY'];
    return [value, name];
  };

  const ChartComponent = type === 'area' ? AreaChart : LineChart;
  const DataComponent = type === 'area' ? Area : Line;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <ChartComponent data={data}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="timestamp" 
              className="text-xs"
              tickFormatter={(value) => new Date(value).toLocaleDateString()}
            />
            <YAxis className="text-xs" />
            <Tooltip 
              formatter={formatTooltip}
              labelFormatter={(value) => new Date(value).toLocaleString()}
              contentStyle={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                border: 'none', 
                borderRadius: '8px',
                color: 'white'
              }} 
            />
            {type === 'area' ? (
              <Area 
                type="monotone" 
                dataKey={dataKey} 
                stroke="#3B82F6" 
                fill="#3B82F6" 
                fillOpacity={0.3}
              />
            ) : (
              <Line 
                type="monotone" 
                dataKey={dataKey} 
                stroke="#3B82F6" 
                strokeWidth={2}
                dot={false}
              />
            )}
          </ChartComponent>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function MultiLineChart({ data, lines, title }) {
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="timestamp" 
              className="text-xs"
              tickFormatter={(value) => new Date(value).toLocaleDateString()}
            />
            <YAxis className="text-xs" />
            <Tooltip 
              labelFormatter={(value) => new Date(value).toLocaleString()}
              contentStyle={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                border: 'none', 
                borderRadius: '8px',
                color: 'white'
              }} 
            />
            {lines.map((line, index) => (
              <Line
                key={line.dataKey}
                type="monotone"
                dataKey={line.dataKey}
                stroke={colors[index % colors.length]}
                strokeWidth={2}
                dot={false}
                name={line.name}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}