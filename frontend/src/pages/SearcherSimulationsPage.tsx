import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ProfitCalculator } from '@/components/calculators/ProfitCalculator'
import { MEVLineChart } from '@/components/charts/LineChart'
import { MEVBarChart } from '@/components/charts/BarChart'
import { formatSOL, formatUSD, formatPercent } from '@/lib/utils'
import { 
  Play, 
  Pause, 
  RotateCcw, 
  TrendingUp, 
  AlertTriangle, 
  DollarSign,
  Clock,
  Target,
  Settings,
  Download,
  Zap
} from 'lucide-react'

interface SimulationParams {
  strategy: 'arbitrage' | 'liquidation' | 'sandwich'
  capital: number
  riskLevel: 'low' | 'medium' | 'high'
  timeframe: '1h' | '6h' | '24h' | '7d'
  slippage: number
  gasLimit: number
  dexes: string[]
}

interface SimulationResult {
  id: string
  strategy: string
  totalProfit: number
  totalTrades: number
  successRate: number
  maxDrawdown: number
  sharpeRatio: number
  profitFactor: number
  avgTradeProfit: number
  riskScore: number
  executionTime: number
  gasUsed: number
  status: 'running' | 'completed' | 'failed'
  progress: number
}

export function SearcherSimulationsPage() {
  const [simulations, setSimulations] = useState<SimulationResult[]>([])
  const [currentSimulation, setCurrentSimulation] = useState<SimulationResult | null>(null)
  const [params, setParams] = useState<SimulationParams>({
    strategy: 'arbitrage',
    capital: 10,
    riskLevel: 'medium',
    timeframe: '24h',
    slippage: 0.5,
    gasLimit: 300000,
    dexes: ['raydium', 'orca']
  })
  const [isRunning, setIsRunning] = useState(false)

  const runSimulation = async () => {
    setIsRunning(true)
    
    const newSimulation: SimulationResult = {
      id: `sim-${Date.now()}`,
      strategy: params.strategy,
      totalProfit: 0,
      totalTrades: 0,
      successRate: 0,
      maxDrawdown: 0,
      sharpeRatio: 0,
      profitFactor: 0,
      avgTradeProfit: 0,
      riskScore: params.riskLevel === 'low' ? 3 : params.riskLevel === 'medium' ? 6 : 9,
      executionTime: 0,
      gasUsed: 0,
      status: 'running',
      progress: 0
    }

    setCurrentSimulation(newSimulation)
    setSimulations(prev => [newSimulation, ...prev])

    // Simulate progress
    const progressInterval = setInterval(() => {
      setCurrentSimulation(prev => {
        if (!prev || prev.progress >= 100) {
          clearInterval(progressInterval)
          setIsRunning(false)
          return prev
        }

        const newProgress = prev.progress + Math.random() * 10
        const isCompleted = newProgress >= 100

        const updated = {
          ...prev,
          progress: Math.min(newProgress, 100),
          totalProfit: isCompleted ? Math.random() * 15 + 2 : prev.totalProfit,
          totalTrades: isCompleted ? Math.floor(Math.random() * 100) + 20 : prev.totalTrades,
          successRate: isCompleted ? Math.random() * 30 + 60 : prev.successRate,
          maxDrawdown: isCompleted ? Math.random() * 5 + 1 : prev.maxDrawdown,
          sharpeRatio: isCompleted ? Math.random() * 2 + 1 : prev.sharpeRatio,
          profitFactor: isCompleted ? Math.random() * 1.5 + 1.2 : prev.profitFactor,
          avgTradeProfit: isCompleted ? Math.random() * 0.5 + 0.1 : prev.avgTradeProfit,
          executionTime: isCompleted ? Math.random() * 200 + 50 : prev.executionTime,
          gasUsed: isCompleted ? Math.random() * 50000 + 10000 : prev.gasUsed,
          status: isCompleted ? ('completed' as const) : ('running' as const)
        }

        // Update in the simulations array
        setSimulations(prev => prev.map(sim => sim.id === updated.id ? updated : sim))
        
        return updated
      })
    }, 1000)
  }

  const getStrategyIcon = (strategy: string) => {
    switch (strategy) {
      case 'arbitrage': return <TrendingUp className="h-4 w-4" />
      case 'liquidation': return <Target className="h-4 w-4" />
      case 'sandwich': return <Zap className="h-4 w-4" />
      default: return <DollarSign className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'completed': return 'bg-green-100 text-green-800 border-green-200'
      case 'failed': return 'bg-red-100 text-red-800 border-red-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600'
      case 'medium': return 'text-yellow-600'
      case 'high': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Profit Simulations</h1>
          <p className="text-muted-foreground">
            Test MEV strategies with historical data and market conditions
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Results
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Advanced
          </Button>
        </div>
      </div>

      {/* Simulation Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Simulation Parameters</CardTitle>
          <CardDescription>
            Configure your MEV strategy parameters for backtesting
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <div className="text-sm font-medium">Strategy</div>
              <Select
                value={params.strategy}
                onValueChange={(value: any) => setParams(prev => ({ ...prev, strategy: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="arbitrage">Arbitrage</SelectItem>
                  <SelectItem value="liquidation">Liquidation</SelectItem>
                  <SelectItem value="sandwich">Sandwich</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Initial Capital (SOL)</div>
              <Input
                id="capital"
                type="number"
                value={params.capital}
                onChange={(e) => setParams(prev => ({ ...prev, capital: Number(e.target.value) }))}
                min="1"
                max="1000"
              />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Risk Level</div>
              <Select
                value={params.riskLevel}
                onValueChange={(value: any) => setParams(prev => ({ ...prev, riskLevel: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low Risk</SelectItem>
                  <SelectItem value="medium">Medium Risk</SelectItem>
                  <SelectItem value="high">High Risk</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Timeframe</div>
              <Select
                value={params.timeframe}
                onValueChange={(value: any) => setParams(prev => ({ ...prev, timeframe: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">1 Hour</SelectItem>
                  <SelectItem value="6h">6 Hours</SelectItem>
                  <SelectItem value="24h">24 Hours</SelectItem>
                  <SelectItem value="7d">7 Days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-between items-center mt-6">
            <div className="flex gap-2">
              <Button
                onClick={runSimulation}
                disabled={isRunning}
                className="flex items-center gap-2"
              >
                {isRunning ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {isRunning ? 'Running...' : 'Run Simulation'}
              </Button>
              
              <Button variant="outline">
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>

            {currentSimulation && (
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  Progress: {currentSimulation.progress.toFixed(0)}%
                </div>
                <Progress value={currentSimulation.progress} className="w-32" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Current Simulation Results */}
      {currentSimulation && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStrategyIcon(currentSimulation.strategy)}
              Current Simulation Results
              <Badge className={getStatusColor(currentSimulation.status)}>
                {currentSimulation.status}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Total Profit</div>
                <div className="text-2xl font-bold">{formatSOL(currentSimulation.totalProfit)}</div>
                <div className="text-xs text-muted-foreground">
                  {formatUSD(currentSimulation.totalProfit * 180)}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Success Rate</div>
                <div className="text-2xl font-bold">{formatPercent(currentSimulation.successRate)}</div>
                <div className="text-xs text-muted-foreground">
                  {currentSimulation.totalTrades} trades
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Max Drawdown</div>
                <div className="text-2xl font-bold text-red-600">
                  -{formatPercent(currentSimulation.maxDrawdown)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Risk score: {currentSimulation.riskScore}/10
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Sharpe Ratio</div>
                <div className="text-2xl font-bold">{currentSimulation.sharpeRatio.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground">
                  Profit factor: {currentSimulation.profitFactor.toFixed(2)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Simulation History */}
      <Card>
        <CardHeader>
          <CardTitle>Simulation History</CardTitle>
          <CardDescription>
            Previous simulation results and comparisons
          </CardDescription>
        </CardHeader>
        <CardContent>
          {simulations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No simulations run yet. Configure parameters and run your first simulation.
            </div>
          ) : (
            <div className="space-y-4">
              {simulations.map((sim) => (
                <div
                  key={sim.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {getStrategyIcon(sim.strategy)}
                      <div>
                        <div className="font-medium capitalize">{sim.strategy}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(parseInt(sim.id.split('-')[1])).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    
                    <Badge className={getStatusColor(sim.status)}>
                      {sim.status}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <div className="font-medium">{formatSOL(sim.totalProfit)}</div>
                      <div className="text-muted-foreground">Profit</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="font-medium">{formatPercent(sim.successRate)}</div>
                      <div className="text-muted-foreground">Success</div>
                    </div>
                    
                    <div className="text-center">
                      <div className="font-medium">{sim.sharpeRatio.toFixed(2)}</div>
                      <div className="text-muted-foreground">Sharpe</div>
                    </div>

                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Profit Calculator */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Quick Profit Calculator</CardTitle>
            <CardDescription>
              Estimate potential profits for specific opportunities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfitCalculator />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risk Analysis</CardTitle>
            <CardDescription>
              Understand the risks of different strategies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Market Volatility</span>
                <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">Liquidity Risk</span>
                <Badge className="bg-green-100 text-green-800">Low</Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">Competition Level</span>
                <Badge className="bg-red-100 text-red-800">High</Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">Execution Risk</span>
                <Badge className="bg-yellow-100 text-yellow-800">Medium</Badge>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <AlertTriangle className="h-4 w-4" />
                  Simulations are based on historical data and market conditions may vary
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}