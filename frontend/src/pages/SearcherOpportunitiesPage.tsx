import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MEVLineChart } from '@/components/charts/LineChart'
import { MEVBarChart } from '@/components/charts/BarChart'
import { OpportunityFeed } from '@/components/mev/OpportunityFeed'
import { ProfitCalculator } from '@/components/calculators/ProfitCalculator'
import { useMEVStore } from '@/stores/mevStore'
import { useAuthStore } from '@/stores/authStore'
import { formatSOL, formatUSD, formatPercent } from '@/lib/utils'
import { Activity, TrendingUp, Zap, DollarSign, AlertTriangle } from 'lucide-react'

interface OpportunityStats {
  totalOpportunities: number
  totalProfit: number
  successRate: number
  averageProfit: number
}

interface TrendData {
  timestamp: string
  value: number
  opportunities: number
  profit: number
  volume: number
  name: string
}

export function SearcherOpportunitiesPage() {
  const { user } = useAuthStore()
  const { opportunities, isLoading } = useMEVStore()
  const [stats, setStats] = useState<OpportunityStats>({
    totalOpportunities: 0,
    totalProfit: 0,
    successRate: 0,
    averageProfit: 0
  })
  const [trendData, setTrendData] = useState<TrendData[]>([])
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1H' | '6H' | '24H' | '7D'>('24H')

  useEffect(() => {
    // Calculate stats from opportunities
    if (opportunities.length > 0) {
      const total = opportunities.length
      const totalProfitValue = opportunities.reduce((sum, op) => sum + op.estimated_profit_sol, 0)
      const successful = opportunities.filter(op => op.status === 'completed').length
      
      setStats({
        totalOpportunities: total,
        totalProfit: totalProfitValue,
        successRate: total > 0 ? (successful / total) * 100 : 0,
        averageProfit: total > 0 ? totalProfitValue / total : 0
      })
    }

    // Generate trend data (mock data for now)
    const generateTrendData = () => {
      const now = new Date()
      const data: TrendData[] = []
      const intervals = selectedTimeframe === '1H' ? 12 : selectedTimeframe === '6H' ? 36 : selectedTimeframe === '24H' ? 24 : 7
      
      for (let i = intervals; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - i * (selectedTimeframe === '7D' ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000))
        const opportunities = Math.floor(Math.random() * 50) + 10
        const profit = Math.random() * 5 + 0.5
        
        data.push({
          timestamp: timestamp.toLocaleTimeString(),
          value: opportunities, // For LineChart
          name: timestamp.toLocaleTimeString(), // For BarChart
          opportunities,
          profit,
          volume: Math.random() * 1000 + 100
        })
      }
      return data
    }

    setTrendData(generateTrendData())
  }, [opportunities, selectedTimeframe])

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Live MEV Opportunities</h1>
          <p className="text-muted-foreground">
            Real-time arbitrage, liquidation, and sandwich opportunities
          </p>
        </div>
        
        <div className="flex gap-2">
          {(['1H', '6H', '24H', '7D'] as const).map((timeframe) => (
            <Button
              key={timeframe}
              variant={selectedTimeframe === timeframe ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedTimeframe(timeframe)}
            >
              {timeframe}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Opportunities</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOpportunities}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last hour
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatSOL(stats.totalProfit)}</div>
            <p className="text-xs text-muted-foreground">
              {formatUSD(stats.totalProfit * 180)} USD
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercent(stats.successRate)}</div>
            <p className="text-xs text-muted-foreground">
              +2.1% from yesterday
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Profit</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatSOL(stats.averageProfit)}</div>
            <p className="text-xs text-muted-foreground">
              Per opportunity
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MEVLineChart
          data={trendData}
          title="Opportunity Trends"
          description={`Opportunities over the last ${selectedTimeframe}`}
          valueKey="opportunities"
          xAxisKey="timestamp"
          height={300}
          color="#3b82f6"
          autoRefresh
          refreshInterval={30000}
        />

        <MEVBarChart
          data={trendData}
          title="Profit Distribution"
          description={`Profit per interval (${selectedTimeframe})`}
          valueKey="profit"
          nameKey="timestamp"
          height={300}
          color="#10b981"
          autoRefresh
          refreshInterval={30000}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Opportunities Feed */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Live Opportunities
              </CardTitle>
              <CardDescription>
                Real-time MEV opportunities with profit estimates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OpportunityFeed />
            </CardContent>
          </Card>
        </div>

        {/* Profit Calculator */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Profit Calculator</CardTitle>
              <CardDescription>
                Estimate your potential MEV profits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProfitCalculator />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Risk Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Risk Analysis
          </CardTitle>
          <CardDescription>
            Current market conditions and execution risks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Network Congestion</span>
                <Badge className={getRiskBadgeColor('medium')}>
                  Medium
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Moderate transaction fees, expect 2-3 second confirmations
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Competition Level</span>
                <Badge className={getRiskBadgeColor('high')}>
                  High
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Many searchers active, quick execution required
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Slippage Risk</span>
                <Badge className={getRiskBadgeColor('low')}>
                  Low
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Good liquidity across major DEXs
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}