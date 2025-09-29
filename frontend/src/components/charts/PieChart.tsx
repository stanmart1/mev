import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useThemeStore } from '@/stores/themeStore'
import { useState, useEffect } from 'react'

interface PieChartData {
  name: string
  value: number
  color?: string
}

interface PieChartProps {
  data: PieChartData[]
  title?: string
  description?: string
  height?: number
  colors?: string[]
  showLegend?: boolean
  innerRadius?: number
  outerRadius?: number
  formatTooltip?: (value: number, name: string) => [string, string]
  loading?: boolean
  animate?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
  onRefresh?: () => void
}

const DEFAULT_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', 
  '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
]

const DARK_COLORS = [
  '#60a5fa', '#34d399', '#fbbf24', '#f87171',
  '#a78bfa', '#22d3ee', '#a3e635', '#fb923c'
]

export function MEVPieChart({
  data,
  title,
  description,
  height = 300,
  colors,
  showLegend = true,
  innerRadius = 0,
  outerRadius = 80,
  formatTooltip,
  loading = false,
  animate = true,
  autoRefresh = false,
  refreshInterval = 30000,
  onRefresh,
}: PieChartProps) {
  const { resolvedTheme } = useThemeStore()
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const chartColors = colors || (resolvedTheme === 'dark' ? DARK_COLORS : DEFAULT_COLORS)

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

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      const value = payload[0].value
      const formattedValue = formatTooltip 
        ? formatTooltip(value, data.name)[0] 
        : `${value.toLocaleString()}`
      
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm text-muted-foreground">{data.name}</p>
          <p className="text-sm font-medium" style={{ color: data.color || chartColors[payload[0].index] }}>
            {formattedValue}
          </p>
          <p className="text-xs text-muted-foreground">
            {((value / data.total) * 100).toFixed(1)}%
          </p>
        </div>
      )
    }
    return null
  }

  const CustomLegend = ({ payload }: any) => {
    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {payload?.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-muted-foreground">{entry.value}</span>
          </div>
        ))}
      </div>
    )
  }

  // Calculate total for percentage calculation
  const dataWithTotal = data.map(item => ({
    ...item,
    total: data.reduce((sum, d) => sum + d.value, 0)
  }))

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
          <PieChart>
            <Pie
              data={dataWithTotal}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={2}
              dataKey="value"
              animationBegin={animate ? 0 : 0}
              animationDuration={animate ? 1000 : 0}
            >
              {dataWithTotal.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.color || chartColors[index % chartColors.length]} 
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend content={<CustomLegend />} />}
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}