import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  RefreshCw, 
  Target, 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  DollarSign,
  Zap,
  Activity,
  ChevronRight,
  Filter,
  Play,
  Pause,
  Wifi,
  WifiOff
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useMEVOpportunities } from '@/hooks/useMEVOpportunities'

export interface MEVOpportunity {
  id: string
  type: 'arbitrage' | 'liquidation' | 'sandwich' | 'flashloan'
  token: string
  pair: string
  estimatedProfit: number
  profitPercentage: number
  riskScore: number
  confidence: number
  gasCost: number
  timeToExpiry: number
  dex: string
  volume: number
  detectedAt: Date
  status: 'active' | 'executing' | 'completed' | 'expired'
  competitionLevel: 'low' | 'medium' | 'high'
}

interface OpportunityFeedProps {
  onExecute?: (opportunity: MEVOpportunity) => void
  className?: string
  filters?: {
    types?: string[]
    minProfit?: number
    maxRisk?: number
  }
}

// Mock data for demonstration
const MOCK_OPPORTUNITIES: MEVOpportunity[] = [
  {
    id: '1',
    type: 'arbitrage',
    token: 'SOL',
    pair: 'SOL/USDC',
    estimatedProfit: 0.45,
    profitPercentage: 2.3,
    riskScore: 3,
    confidence: 85,
    gasCost: 0.001,
    timeToExpiry: 45,
    dex: 'Raydium → Orca',
    volume: 15000,
    detectedAt: new Date(Date.now() - 30000),
    status: 'active',
    competitionLevel: 'low'
  },
  {
    id: '2',
    type: 'liquidation',
    token: 'BTC',
    pair: 'BTC/SOL',
    estimatedProfit: 1.25,
    profitPercentage: 5.7,
    riskScore: 6,
    confidence: 72,
    gasCost: 0.002,
    timeToExpiry: 120,
    dex: 'Solend',
    volume: 8500,
    detectedAt: new Date(Date.now() - 60000),
    status: 'active',
    competitionLevel: 'medium'
  },
  {
    id: '3',
    type: 'sandwich',
    token: 'RAY',
    pair: 'RAY/USDC',
    estimatedProfit: 0.18,
    profitPercentage: 1.8,
    riskScore: 8,
    confidence: 45,
    gasCost: 0.003,
    timeToExpiry: 15,
    dex: 'Jupiter',
    volume: 25000,
    detectedAt: new Date(Date.now() - 15000),
    status: 'active',
    competitionLevel: 'high'
  }
]

export function OpportunityFeed({ 
  onExecute,
  className,
  filters
}: OpportunityFeedProps) {
  const [filter, setFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<'profit' | 'risk' | 'time'>('profit')
  
  // Use WebSocket hook for real-time opportunities
  const {
    opportunities,
    loading,
    error,
    isConnected,
    lastUpdate,
    newOpportunityCount,
    totalCount
  } = useMEVOpportunities({
    filters: {
      type: filter === 'all' ? undefined : [filter],
      ...filters
    },
    maxOpportunities: 50,
    autoRemoveExpired: true,
    notifyOnNew: true
  })

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'arbitrage': return <TrendingUp className="h-4 w-4" />
      case 'liquidation': return <Target className="h-4 w-4" />
      case 'sandwich': return <Zap className="h-4 w-4" />
      case 'flashloan': return <Activity className="h-4 w-4" />
      default: return <DollarSign className="h-4 w-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'arbitrage': return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20'
      case 'liquidation': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20'
      case 'sandwich': return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/20'
      case 'flashloan': return 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/20'
      default: return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20'
    }
  }

  const getRiskColor = (score: number) => {
    if (score <= 3) return 'text-green-600'
    if (score <= 6) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getRiskLabel = (score: number) => {
    if (score <= 3) return 'Low'
    if (score <= 6) return 'Medium'
    return 'High'
  }

  const getCompetitionColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-100 dark:bg-green-900/20'
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20'
      case 'high': return 'text-red-600 bg-red-100 dark:bg-red-900/20'
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20'
    }
  }

  const filteredOpportunities = opportunities
    .filter(opp => filter === 'all' || opp.type === filter)
    .sort((a, b) => {
      switch (sortBy) {
        case 'profit': return b.estimatedProfit - a.estimatedProfit
        case 'risk': return a.riskScore - b.riskScore
        case 'time': return a.timeToExpiry - b.timeToExpiry
        default: return 0
      }
    })

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Live MEV Opportunities
              {isConnected ? (
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
              ) : (
                <div className="h-2 w-2 bg-red-500 rounded-full" />
              )}
              {newOpportunityCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  +{newOpportunityCount} new
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {isConnected 
                ? `Real-time MEV opportunities with risk assessment (${totalCount} total detected)`
                : 'Connecting to opportunity feed...'
              }
              {error && (
                <div className="text-destructive mt-1">
                  Connection error: {error}
                </div>
              )}
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            
            {!isConnected && (
              <Button
                variant="outline"
                size="sm"
                className="text-destructive border-destructive"
                onClick={() => window.location.reload()}
              >
                <WifiOff className="h-4 w-4 mr-2" />
                Reconnect
              </Button>
            )}
            
            {isConnected && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Wifi className="h-4 w-4" />
                Connected
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="text-sm border border-input rounded px-2 py-1 bg-background"
            >
              <option value="all">All Types</option>
              <option value="arbitrage">Arbitrage</option>
              <option value="liquidation">Liquidation</option>
              <option value="sandwich">Sandwich</option>
              <option value="flashloan">Flash Loan</option>
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-sm border border-input rounded px-2 py-1 bg-background"
            >
              <option value="profit">Profit</option>
              <option value="risk">Risk</option>
              <option value="time">Time Left</option>
            </select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-3">
          {filteredOpportunities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No opportunities match your filters</p>
            </div>
          ) : (
            filteredOpportunities.map((opportunity) => (
              <Card key={opportunity.id} className="p-4 hover:shadow-md transition-all">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {/* Type Badge */}
                    <Badge className={`${getTypeColor(opportunity.type)} border-0`}>
                      {getTypeIcon(opportunity.type)}
                      {opportunity.type}
                    </Badge>
                    
                    {/* Token Info */}
                    <div>
                      <div className="font-medium text-sm">{opportunity.pair}</div>
                      <div className="text-xs text-muted-foreground">{opportunity.dex}</div>
                    </div>
                  </div>
                  
                  {/* Profit Info */}
                  <div className="text-right">
                    <div className="font-bold text-green-600">
                      +{opportunity.estimatedProfit.toFixed(4)} SOL
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {opportunity.profitPercentage.toFixed(2)}% profit
                    </div>
                  </div>
                </div>

                {/* Metrics Row */}
                <div className="grid grid-cols-4 gap-4 mt-3 text-xs">
                  <div>
                    <div className="text-muted-foreground">Risk</div>
                    <div className={`font-medium ${getRiskColor(opportunity.riskScore)}`}>
                      {getRiskLabel(opportunity.riskScore)} ({opportunity.riskScore}/10)
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-muted-foreground">Confidence</div>
                    <div className="font-medium">{opportunity.confidence}%</div>
                  </div>
                  
                  <div>
                    <div className="text-muted-foreground">Gas Cost</div>
                    <div className="font-medium">{opportunity.gasCost.toFixed(4)} SOL</div>
                  </div>
                  
                  <div>
                    <div className="text-muted-foreground">Time Left</div>
                    <div className={`font-medium ${opportunity.timeToExpiry < 30 ? 'text-red-600' : ''}`}>
                      {opportunity.timeToExpiry}s
                    </div>
                  </div>
                </div>

                {/* Progress Bars */}
                <div className="space-y-2 mt-3">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Confidence Level</span>
                      <span>{opportunity.confidence}%</span>
                    </div>
                    <Progress value={opportunity.confidence} className="h-1.5" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span>Time Remaining</span>
                      <span>{Math.round((opportunity.timeToExpiry / 120) * 100)}%</span>
                    </div>
                    <Progress 
                      value={Math.max(0, (opportunity.timeToExpiry / 120) * 100)} 
                      className="h-1.5" 
                    />
                  </div>
                </div>

                {/* Competition & Action */}
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getCompetitionColor(opportunity.competitionLevel)}>
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {opportunity.competitionLevel} competition
                    </Badge>
                    
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(opportunity.detectedAt, { addSuffix: true })}
                    </span>
                  </div>
                  
                  <Button
                    size="sm"
                    onClick={() => onExecute?.(opportunity)}
                    disabled={opportunity.status !== 'active' || opportunity.timeToExpiry < 5}
                    className="h-7"
                  >
                    Execute
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}