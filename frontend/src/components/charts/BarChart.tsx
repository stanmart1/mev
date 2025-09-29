import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useThemeStore } from '@/stores/themeStore'
import { useState, useEffect } from 'react'

interface BarConfig {
  key: string
  name: string
  color: string
}

interface BarChartData {
  name: string
  value: number
  [key: string]: any
}

interface BarChartProps {
  data: BarChartData[]
  bars?: BarConfig[]
  title?: string
  description?: string
  valueKey?: string
  nameKey?: string
  height?: number
  color?: string
  showGrid?: boolean
  showLegend?: boolean
  orientation?: 'vertical' | 'horizontal'
  formatTooltip?: (value: number, name: string) => [string, string]
  loading?: boolean
  animate?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
  onRefresh?: () => void
}

export function MEVBarChart({
  data,
  bars,
  title,
  description,
  valueKey = 'value',
  nameKey = 'name',
  height = 300,
  color = '#10b981',
  showGrid = true,
  showLegend = false,
  orientation = 'vertical',
  formatTooltip,
  loading = false,
  animate = true,
  autoRefresh = false,
  refreshInterval = 30000,
  onRefresh,
}: BarChartProps) {
  const { resolvedTheme } = useThemeStore()
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const chartColor = resolvedTheme === 'dark' ? '#34d399' : color

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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0].value
      const formattedValue = formatTooltip 
        ? formatTooltip(value, payload[0].name)[0] 
        : value.toLocaleString()
      
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
          <BarChart 
            data={data} 
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            layout={orientation === 'horizontal' ? 'horizontal' : 'vertical'}
          >
            {showGrid && (
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke={resolvedTheme === 'dark' ? '#374151' : '#e5e7eb'}
              />
            )}
            <XAxis 
              type={orientation === 'horizontal' ? 'number' : 'category'}
              dataKey={orientation === 'horizontal' ? undefined : nameKey}
              tick={{ fontSize: 12, fill: resolvedTheme === 'dark' ? '#9ca3af' : '#6b7280' }}
              axisLine={{ stroke: resolvedTheme === 'dark' ? '#374151' : '#e5e7eb' }}
            />
            <YAxis 
              type={orientation === 'horizontal' ? 'category' : 'number'}
              dataKey={orientation === 'horizontal' ? nameKey : undefined}
              tick={{ fontSize: 12, fill: resolvedTheme === 'dark' ? '#9ca3af' : '#6b7280' }}
              axisLine={{ stroke: resolvedTheme === 'dark' ? '#374151' : '#e5e7eb' }}
            />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend />}
            {bars ? (
              bars.map((bar, index) => (
                <Bar
                  key={bar.key}
                  dataKey={bar.key}
                  name={bar.name}
                  fill={bar.color}
                  radius={[4, 4, 0, 0]}
                  animationBegin={animate ? index * 300 : 0}
                  animationDuration={animate ? 1000 : 0}
                />
              ))
            ) : (
              <Bar
                dataKey={valueKey}
                fill={chartColor}
                radius={[4, 4, 0, 0]}
                animationBegin={animate ? 0 : 0}
                animationDuration={animate ? 1000 : 0}
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}