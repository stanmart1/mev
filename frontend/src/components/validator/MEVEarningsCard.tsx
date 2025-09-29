import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Target, 
  Zap,
  Clock,
  Award,
  AlertCircle
} from 'lucide-react'

interface MEVEarnings {
  totalEarnings: number
  currentEpoch: number
  epochEarnings: number
  previousEpochEarnings: number
  averageEpochEarnings: number
  jitoMEVEarnings: number
  nonJitoMEVEarnings: number
  mevRank: number
  totalValidators: number
  jitoEnabled: boolean
  jitoPerformance: number
}

interface MEVEarningsProps {
  validatorId?: string
  className?: string
}

export function MEVEarningsCard({ validatorId, className }: MEVEarningsProps) {
  const [earnings, setEarnings] = useState<MEVEarnings>({
    totalEarnings: 245.67,
    currentEpoch: 487,
    epochEarnings: 12.45,
    previousEpochEarnings: 10.32,
    averageEpochEarnings: 8.75,
    jitoMEVEarnings: 8.90,
    nonJitoMEVEarnings: 3.55,
    mevRank: 42,
    totalValidators: 1847,
    jitoEnabled: true,
    jitoPerformance: 85.4
  })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadMEVEarnings()
  }, [validatorId])

  const loadMEVEarnings = async () => {
    setIsLoading(true)
    try {
      // TODO: Implement API call
      // const response = await fetch(`/api/validators/${validatorId}/mev-earnings`)
      // const data = await response.json()
      // setEarnings(data)
    } catch (error) {
      console.error('Failed to load MEV earnings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const epochChange = earnings.epochEarnings - earnings.previousEpochEarnings
  const epochChangePercent = (epochChange / earnings.previousEpochEarnings) * 100
  const performanceVsAverage = ((earnings.epochEarnings - earnings.averageEpochEarnings) / earnings.averageEpochEarnings) * 100

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          MEV Earnings
          {earnings.jitoEnabled && (
            <Badge className="bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400">
              <Zap className="h-3 w-3 mr-1" />
              Jito
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Your MEV earnings performance and network ranking
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Total Earnings Overview */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Total MEV Earnings</p>
            <p className="text-2xl font-bold">{earnings.totalEarnings.toFixed(2)} SOL</p>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Network Rank</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">#{earnings.mevRank}</p>
              <span className="text-sm text-muted-foreground">
                of {earnings.totalValidators.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Current Epoch Performance */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Epoch {earnings.currentEpoch} Performance</h4>
            <Badge variant={epochChange >= 0 ? 'default' : 'destructive'}>
              {epochChange >= 0 ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              {epochChangePercent >= 0 ? '+' : ''}{epochChangePercent.toFixed(1)}%
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-lg font-semibold">{earnings.epochEarnings.toFixed(2)} SOL</p>
              <p className="text-xs text-muted-foreground">Current Epoch</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">{earnings.previousEpochEarnings.toFixed(2)} SOL</p>
              <p className="text-xs text-muted-foreground">Previous Epoch</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">{earnings.averageEpochEarnings.toFixed(2)} SOL</p>
              <p className="text-xs text-muted-foreground">Network Average</p>
            </div>
          </div>

          {/* Performance vs Network Average */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Performance vs Network Average</span>
              <span className={performanceVsAverage >= 0 ? 'text-green-600' : 'text-red-600'}>
                {performanceVsAverage >= 0 ? '+' : ''}{performanceVsAverage.toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={Math.min(Math.max(50 + performanceVsAverage, 0), 100)} 
              className="h-2" 
            />
          </div>
        </div>

        {/* Jito MEV Breakdown */}
        {earnings.jitoEnabled && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium flex items-center gap-2">
                <Zap className="h-4 w-4 text-orange-500" />
                Jito MEV Breakdown
              </h4>
              <Badge variant="outline" className="text-orange-600 border-orange-600">
                {earnings.jitoPerformance.toFixed(1)}% Performance
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Jito MEV</span>
                  <span className="font-medium">{earnings.jitoMEVEarnings.toFixed(2)} SOL</span>
                </div>
                <Progress 
                  value={(earnings.jitoMEVEarnings / earnings.epochEarnings) * 100} 
                  className="h-2"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Non-Jito MEV</span>
                  <span className="font-medium">{earnings.nonJitoMEVEarnings.toFixed(2)} SOL</span>
                </div>
                <Progress 
                  value={(earnings.nonJitoMEVEarnings / earnings.epochEarnings) * 100} 
                  className="h-2"
                />
              </div>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              {((earnings.jitoMEVEarnings / earnings.epochEarnings) * 100).toFixed(1)}% of MEV earnings from Jito
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-sm font-medium">MEV Efficiency</p>
              <p className="text-xs text-muted-foreground">
                {((earnings.epochEarnings / earnings.averageEpochEarnings) * 100).toFixed(0)}% of optimal
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-yellow-500" />
            <div>
              <p className="text-sm font-medium">Top Percentile</p>
              <p className="text-xs text-muted-foreground">
                {(((earnings.totalValidators - earnings.mevRank) / earnings.totalValidators) * 100).toFixed(0)}th percentile
              </p>
            </div>
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}