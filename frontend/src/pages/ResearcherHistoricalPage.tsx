import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { MEVLineChart } from '@/components/charts/LineChart'
import { MEVBarChart } from '@/components/charts/BarChart'
import { MEVPieChart } from '@/components/charts/PieChart'
import { MEVCandlestickChart } from '@/components/charts/CandlestickChart'
import { DataTable } from '@/components/ui/data-table'
import { formatSOL, formatUSD, formatPercent, formatNumber } from '@/lib/utils'
import { 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  Download, 
  Calendar,
  Filter,
  Search,
  Database,
  FileText,
  Activity
} from 'lucide-react'

interface HistoricalData {
  date: string
  total_opportunities: number
  arbitrage_count: number
  liquidation_count: number
  sandwich_count: number
  total_profit_sol: number
  avg_profit_per_opp: number
  success_rate: number
  gas_costs_sol: number
  validator_rewards_sol: number
}

interface ValidatorPerformance {
  pubkey: string
  name: string
  mev_rewards_sol: number
  blocks_produced: number
  commission: number
  stake_amount: number
  efficiency_score: number
}

export function ResearcherHistoricalPage() {
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | '1y'>('30d')
  const [dataType, setDataType] = useState<'opportunities' | 'validators' | 'market'>('opportunities')
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([])
  const [validatorData, setValidatorData] = useState<ValidatorPerformance[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Generate mock historical data
  useEffect(() => {
    setIsLoading(true)
    
    // Simulate API call
    setTimeout(() => {
      const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : timeframe === '90d' ? 90 : 365
      const data: HistoricalData[] = []
      
      for (let i = days; i >= 0; i--) {
        const date = new Date()
        date.setDate(date.getDate() - i)
        
        data.push({
          date: date.toISOString().split('T')[0],
          total_opportunities: Math.floor(Math.random() * 200) + 50,
          arbitrage_count: Math.floor(Math.random() * 100) + 20,
          liquidation_count: Math.floor(Math.random() * 50) + 10,
          sandwich_count: Math.floor(Math.random() * 30) + 5,
          total_profit_sol: Math.random() * 50 + 10,
          avg_profit_per_opp: Math.random() * 0.5 + 0.1,
          success_rate: Math.random() * 30 + 60,
          gas_costs_sol: Math.random() * 2 + 0.5,
          validator_rewards_sol: Math.random() * 100 + 20
        })
      }
      
      setHistoricalData(data)
      
      // Generate validator data
      const validators: ValidatorPerformance[] = [
        {
          pubkey: '7Np41oeYqPefeNQEHSv1UDhYrehxin3NStELsSKCT4K2',
          name: 'Jito Foundation',
          mev_rewards_sol: 1234.56,
          blocks_produced: 892,
          commission: 10,
          stake_amount: 1500000,
          efficiency_score: 95.2
        },
        {
          pubkey: '7K8DVxtNJGnMtUY1CQJT5jcs8sFGSZTDiG7kowvFpECh',
          name: 'Solana Foundation',
          mev_rewards_sol: 987.43,
          blocks_produced: 756,
          commission: 7,
          stake_amount: 2100000,
          efficiency_score: 92.8
        },
        {
          pubkey: '9QKUjL7LWiw7YxTu8gHMj1hL8mw4KWLaLZZaLCqe2wFt',
          name: 'Coinbase Cloud',
          mev_rewards_sol: 756.89,
          blocks_produced: 623,
          commission: 8,
          stake_amount: 1800000,
          efficiency_score: 89.5
        }
      ]
      
      setValidatorData(validators)
      setIsLoading(false)
    }, 1000)
  }, [timeframe])

  const totalOpportunities = historicalData.reduce((sum, d) => sum + d.total_opportunities, 0)
  const totalProfit = historicalData.reduce((sum, d) => sum + d.total_profit_sol, 0)
  const avgSuccessRate = historicalData.length > 0 
    ? historicalData.reduce((sum, d) => sum + d.success_rate, 0) / historicalData.length 
    : 0

  const opportunityDistribution = historicalData.length > 0 ? [
    {
      name: 'Arbitrage',
      value: historicalData.reduce((sum, d) => sum + d.arbitrage_count, 0)
    },
    {
      name: 'Liquidation',
      value: historicalData.reduce((sum, d) => sum + d.liquidation_count, 0)
    },
    {
      name: 'Sandwich',
      value: historicalData.reduce((sum, d) => sum + d.sandwich_count, 0)
    }
  ] : []

  const chartData = historicalData.map(d => ({
    timestamp: d.date,
    value: d.total_opportunities,
    name: d.date,
    opportunities: d.total_opportunities,
    profit: d.total_profit_sol,
    successRate: d.success_rate
  }))

  const validatorColumns = [
    {
      accessorKey: 'name',
      header: 'Validator',
      cell: ({ row }: any) => (
        <div>
          <div className="font-medium">{row.getValue('name')}</div>
          <div className="text-xs text-muted-foreground">
            {row.original.pubkey.slice(0, 8)}...{row.original.pubkey.slice(-6)}
          </div>
        </div>
      )
    },
    {
      accessorKey: 'mev_rewards_sol',
      header: 'MEV Rewards',
      cell: ({ row }: any) => formatSOL(row.getValue('mev_rewards_sol'))
    },
    {
      accessorKey: 'blocks_produced',
      header: 'Blocks',
      cell: ({ row }: any) => formatNumber(row.getValue('blocks_produced'))
    },
    {
      accessorKey: 'commission',
      header: 'Commission',
      cell: ({ row }: any) => `${row.getValue('commission')}%`
    },
    {
      accessorKey: 'efficiency_score',
      header: 'Efficiency',
      cell: ({ row }: any) => (
        <Badge variant="outline">
          {row.getValue('efficiency_score')}%
        </Badge>
      )
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Historical Data Analytics</h1>
          <p className="text-muted-foreground">
            Comprehensive analysis of MEV trends and validator performance
          </p>
        </div>
        
        <div className="flex gap-2">
          <Select value={timeframe} onValueChange={(value: any) => setTimeframe(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
              <SelectItem value="90d">90 Days</SelectItem>
              <SelectItem value="1y">1 Year</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={dataType} onValueChange={(value: any) => setDataType(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="opportunities">Opportunities</SelectItem>
              <SelectItem value="validators">Validators</SelectItem>
              <SelectItem value="market">Market Data</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Opportunities</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalOpportunities)}</div>
            <p className="text-xs text-muted-foreground">
              {timeframe.toUpperCase()} period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatSOL(totalProfit)}</div>
            <p className="text-xs text-muted-foreground">
              {formatUSD(totalProfit * 180)} equivalent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Success Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercent(avgSuccessRate)}</div>
            <p className="text-xs text-muted-foreground">
              Historical average
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Validators</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{validatorData.length}</div>
            <p className="text-xs text-muted-foreground">
              Top performers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MEVLineChart
          data={chartData}
          title="MEV Opportunities Over Time"
          description={`Opportunities detected in the last ${timeframe}`}
          valueKey="opportunities"
          xAxisKey="timestamp"
          height={350}
          showLegend={false}
        />

        <MEVLineChart
          data={chartData}
          title="Profit Trends"
          description={`Total MEV profits over ${timeframe}`}
          valueKey="profit"
          xAxisKey="timestamp"
          height={350}
          color="#10b981"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MEVPieChart
          data={opportunityDistribution}
          title="Opportunity Distribution"
          description="Breakdown by strategy type"
          height={350}
        />

        <MEVBarChart
          data={chartData.slice(-7)} // Last 7 days
          title="Recent Activity"
          description="Daily opportunities (last 7 days)"
          valueKey="opportunities"
          nameKey="timestamp"
          height={350}
        />
      </div>

      {/* Data Tables */}
      {dataType === 'validators' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Validator Performance
            </CardTitle>
            <CardDescription>
              Historical MEV performance metrics for top validators
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={validatorColumns}
              data={validatorData}
            />
          </CardContent>
        </Card>
      )}

      {dataType === 'opportunities' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Historical Opportunities
            </CardTitle>
            <CardDescription>
              Daily breakdown of MEV opportunities and performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-4 text-left">Date</th>
                    <th className="p-4 text-left">Opportunities</th>
                    <th className="p-4 text-left">Profit (SOL)</th>
                    <th className="p-4 text-left">Success Rate</th>
                    <th className="p-4 text-left">Avg Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {historicalData.slice(-10).map((row, index) => (
                    <tr key={index} className="border-b">
                      <td className="p-4">{row.date}</td>
                      <td className="p-4">{formatNumber(row.total_opportunities)}</td>
                      <td className="p-4">{formatSOL(row.total_profit_sol)}</td>
                      <td className="p-4">{formatPercent(row.success_rate)}</td>
                      <td className="p-4">{formatSOL(row.avg_profit_per_opp)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Research Tools */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Research Tools
          </CardTitle>
          <CardDescription>
            Additional tools for in-depth MEV research and analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-20 flex-col">
              <Search className="h-6 w-6 mb-2" />
              <span>Transaction Explorer</span>
            </Button>
            
            <Button variant="outline" className="h-20 flex-col">
              <PieChart className="h-6 w-6 mb-2" />
              <span>Market Analysis</span>
            </Button>
            
            <Button variant="outline" className="h-20 flex-col">
              <Calendar className="h-6 w-6 mb-2" />
              <span>Custom Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}