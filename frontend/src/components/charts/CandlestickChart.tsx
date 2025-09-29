import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useThemeStore } from '@/stores/themeStore'
import { useState, useEffect } from 'react'

interface CandlestickData {
  timestamp: string
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

interface CandlestickChartProps {
  data: CandlestickData[]
  title?: string
  description?: string
  height?: number
  showVolume?: boolean
  formatTooltip?: (value: number, name: string) => [string, string]
  loading?: boolean
  animate?: boolean
  autoRefresh?: boolean
  refreshInterval?: number
  onRefresh?: () => void
}

// Custom Candlestick component
const Candlestick = (props: any) => {
  const { payload, x, y, width, height } = props
  const { resolvedTheme } = useThemeStore()
  
  if (!payload) return null
  
  const { open, high, low, close } = payload
  const isPositive = close >= open
  
  const candleColor = isPositive 
    ? (resolvedTheme === 'dark' ? '#22c55e' : '#16a34a')
    : (resolvedTheme === 'dark' ? '#ef4444' : '#dc2626')
  
  const wickX = x + width / 2
  const candleWidth = Math.max(width * 0.6, 2)
  const candleX = x + (width - candleWidth) / 2
  
  const topPrice = Math.max(open, close)
  const bottomPrice = Math.min(open, close)
  const priceRange = high - low
  
  if (priceRange === 0) return null
  
  const topY = y + ((high - topPrice) / priceRange) * height
  const bottomY = y + ((high - bottomPrice) / priceRange) * height
  const wickTopY = y + ((high - high) / priceRange) * height
  const wickBottomY = y + ((high - low) / priceRange) * height
  
  return (
    <g>
      {/* Upper wick */}
      <line
        x1={wickX}
        y1={wickTopY}
        x2={wickX}
        y2={topY}
        stroke={candleColor}
        strokeWidth={1}
      />
      {/* Lower wick */}
      <line
        x1={wickX}
        y1={bottomY}
        x2={wickX}
        y2={wickBottomY}
        stroke={candleColor}
        strokeWidth={1}
      />
      {/* Candle body */}
      <rect
        x={candleX}
        y={topY}
        width={candleWidth}
        height={Math.max(bottomY - topY, 1)}
        fill={isPositive ? candleColor : candleColor}
        stroke={candleColor}
        strokeWidth={1}
        opacity={isPositive ? 0.8 : 1}
      />
    </g>
  )
}

export function MEVCandlestickChart({
  data,
  title,
  description,
  height = 400,
  showVolume = true,
  formatTooltip,
  loading = false,
  animate = true,
  autoRefresh = false,
  refreshInterval = 30000,
  onRefresh,
}: CandlestickChartProps) {
  const { resolvedTheme } = useThemeStore()
  const [isRefreshing, setIsRefreshing] = useState(false)

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
      const data = payload[0].payload
      
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-sm text-muted-foreground mb-2">{label}</p>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Open:</span>
              <span className="font-medium">{data.open?.toFixed(4)} SOL</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">High:</span>
              <span className="font-medium text-green-500">{data.high?.toFixed(4)} SOL</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Low:</span>
              <span className="font-medium text-red-500">{data.low?.toFixed(4)} SOL</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Close:</span>
              <span className="font-medium">{data.close?.toFixed(4)} SOL</span>
            </div>
            {data.volume && (
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Volume:</span>
                <span className="font-medium">{data.volume.toLocaleString()}</span>
              </div>
            )}
          </div>
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
          <ComposedChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke={resolvedTheme === 'dark' ? '#374151' : '#e5e7eb'}
            />
            <XAxis 
              dataKey="timestamp"
              tick={{ fontSize: 12, fill: resolvedTheme === 'dark' ? '#9ca3af' : '#6b7280' }}
              axisLine={{ stroke: resolvedTheme === 'dark' ? '#374151' : '#e5e7eb' }}
            />
            <YAxis 
              domain={['dataMin - 0.01', 'dataMax + 0.01']}
              tick={{ fontSize: 12, fill: resolvedTheme === 'dark' ? '#9ca3af' : '#6b7280' }}
              axisLine={{ stroke: resolvedTheme === 'dark' ? '#374151' : '#e5e7eb' }}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Render candlesticks using custom component */}
            <Bar 
              dataKey="high" 
              shape={<Candlestick />}
              isAnimationActive={false}
            />
            
            {showVolume && (
              <Bar
                dataKey="volume"
                yAxisId="volume"
                fill={resolvedTheme === 'dark' ? '#374151' : '#e5e7eb'}
                opacity={0.3}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}