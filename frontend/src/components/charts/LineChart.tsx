import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useThemeStore } from '@/stores/themeStore'
import { useState, useEffect, useMemo } from 'react'

interface LineChartData {
  timestamp: string
  value: number
  label?: string
  [key: string]: any
}

interface LineConfig {
  key: string
  name: string
  color: string
  strokeWidth?: number
  strokeDasharray?: string
}

interface LineChartProps {
  data: LineChartData[]
  lines?: LineConfig[]
  title?: string
  description?: string
  valueKey?: string
  xAxisKey?: string
  height?: number
  color?: string
  showGrid?: boolean
  showLegend?: boolean
  formatTooltip?: (value: number, name: string) => [string, string]
  loading?: boolean
  animate?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
  onRefresh?: () => void
}

export function MEVLineChart({
  data,
  lines,
  title,
  description,
  valueKey = 'value',
  xAxisKey = 'timestamp',
  height = 300,
  color = '#3b82f6',
  showGrid = true,
  showLegend = false,
  formatTooltip,
  loading = false,
  animate = true,
  autoRefresh = false,
  refreshInterval = 30000,
  onRefresh,
}: LineChartProps) {
  const { resolvedTheme } = useThemeStore()
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const chartColor = resolvedTheme === 'dark' ? '#60a5fa' : color

  // Auto refresh functionality
  useEffect(() => {
    if (autoRefresh && onRefresh) {
      const interval = setInterval(() => {
        setIsRefreshing(true)
        onRefresh()
        setTimeout(() => setIsRefreshing(false), 1000)
      }, refreshInterval)
      
      return () => clearInterval(interval)
    }
  }, [autoRefresh, onRefresh, refreshInterval])

  // Prepare line configurations
  const lineConfigs = useMemo(() => {
    if (lines && lines.length > 0) {
      return lines
    }
    return [{
      key: valueKey,
      name: title || 'Value',
      color: chartColor,
      strokeWidth: 2
    }]
  }, [lines, valueKey, title, chartColor])

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0].value
      const formattedValue = formatTooltip 
        ? formatTooltip(value, payload[0].name)[0] 
        : `${value.toFixed(6)} SOL`
      
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-sm font-medium" style={{ color: chartColor }}>
            {formattedValue}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <Card className="w-full">
      {(title || description) && (
        <CardHeader className="pb-2">
          {title && <CardTitle className="text-lg">{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            {showGrid && (
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke={resolvedTheme === 'dark' ? '#374151' : '#e5e7eb'}
              />
            )}
            <XAxis 
              dataKey={xAxisKey}
              tick={{ fontSize: 12, fill: resolvedTheme === 'dark' ? '#9ca3af' : '#6b7280' }}
              axisLine={{ stroke: resolvedTheme === 'dark' ? '#374151' : '#e5e7eb' }}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: resolvedTheme === 'dark' ? '#9ca3af' : '#6b7280' }}
              axisLine={{ stroke: resolvedTheme === 'dark' ? '#374151' : '#e5e7eb' }}
            />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend />}
            {lineConfigs.map((lineConfig, index) => (
              <Line
                key={lineConfig.key}
                type="monotone"
                dataKey={lineConfig.key}
                name={lineConfig.name}
                stroke={lineConfig.color}
                strokeWidth={lineConfig.strokeWidth || 2}
                strokeDasharray={lineConfig.strokeDasharray}
                dot={{ fill: lineConfig.color, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: lineConfig.color, strokeWidth: 2, fill: '#ffffff' }}
                animationBegin={animate ? index * 300 : 0}
                animationDuration={animate ? 1000 : 0}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}