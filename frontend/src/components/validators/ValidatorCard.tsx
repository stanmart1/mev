import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Shield, 
  TrendingUp, 
  Users, 
  Coins, 
  Activity, 
  CheckCircle, 
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Star
} from 'lucide-react'

export interface ValidatorMetrics {
  address: string
  name: string
  commission: number
  apy: number
  stakeAmount: number
  uptime: number
  mevRewards: number
  delegators: number
  rank: number
  isJitoEnabled: boolean
  reliability: number
  performance: number
  badge?: 'top' | 'recommended' | 'rising'
}

interface ValidatorCardProps {
  validator: ValidatorMetrics
  onSelect?: (validator: ValidatorMetrics) => void
  onCompare?: (validator: ValidatorMetrics) => void
  isSelected?: boolean
  isComparing?: boolean
  showComparison?: boolean
}

export function ValidatorCard({ 
  validator, 
  onSelect, 
  onCompare,
  isSelected = false,
  isComparing = false,
  showComparison = true
}: ValidatorCardProps) {
  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`
    }
    return amount.toFixed(2)
  }

  const getBadgeVariant = (badge: string) => {
    switch (badge) {
      case 'top': return 'default'
      case 'recommended': return 'secondary'
      case 'rising': return 'outline'
      default: return 'outline'
    }
  }

  const getBadgeIcon = (badge: string) => {
    switch (badge) {
      case 'top': return <Star className="h-3 w-3" />
      case 'recommended': return <CheckCircle className="h-3 w-3" />
      case 'rising': return <TrendingUp className="h-3 w-3" />
      default: return null
    }
  }

  return (
    <Card className={`transition-all duration-200 hover:shadow-lg ${
      isSelected ? 'ring-2 ring-primary border-primary' : ''
    }`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {validator.name}
              {validator.isJitoEnabled && (
                <Badge variant="outline" className="text-xs">
                  <Activity className="h-3 w-3 mr-1" />
                  Jito
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="font-mono text-xs">
              {formatAddress(validator.address)}
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            {validator.badge && (
              <Badge variant={getBadgeVariant(validator.badge)} className="text-xs">
                {getBadgeIcon(validator.badge)}
                {validator.badge}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              #{validator.rank}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Coins className="h-3 w-3" />
              APY
            </div>
            <div className="text-lg font-bold text-green-600">
              {validator.apy.toFixed(2)}%
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              Commission
            </div>
            <div className="text-lg font-bold">
              {validator.commission.toFixed(1)}%
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Shield className="h-3 w-3" />
              Stake
            </div>
            <div className="text-sm font-medium">
              {formatCurrency(validator.stakeAmount)} SOL
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              Delegators
            </div>
            <div className="text-sm font-medium">
              {validator.delegators.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Performance Indicators */}
        <div className="space-y-3">
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Uptime</span>
              <span className="font-medium">{validator.uptime.toFixed(1)}%</span>
            </div>
            <Progress value={validator.uptime} className="h-2" />
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Reliability</span>
              <span className="font-medium">{validator.reliability.toFixed(0)}/100</span>
            </div>
            <Progress value={validator.reliability} className="h-2" />
          </div>
          
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Performance</span>
              <span className="font-medium">{validator.performance.toFixed(0)}/100</span>
            </div>
            <Progress value={validator.performance} className="h-2" />
          </div>
        </div>

        {/* MEV Rewards */}
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">MEV Rewards (30d)</p>
              <p className="text-sm font-bold text-primary">
                {formatCurrency(validator.mevRewards)} SOL
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-xs text-green-600">
                <ArrowUpRight className="h-3 w-3" />
                +12.4%
              </div>
              <p className="text-xs text-muted-foreground">vs last month</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button 
            variant={isSelected ? "default" : "outline"} 
            size="sm" 
            className="flex-1"
            onClick={() => onSelect?.(validator)}
          >
            {isSelected ? (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Selected
              </>
            ) : (
              'Select'
            )}
          </Button>
          
          {showComparison && (
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => onCompare?.(validator)}
              disabled={isComparing}
            >
              {isComparing ? 'Comparing...' : 'Compare'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Validator Comparison Component
interface ValidatorComparisonProps {
  validators: ValidatorMetrics[]
  onRemove?: (address: string) => void
  className?: string
}

export function ValidatorComparison({ 
  validators, 
  onRemove,
  className 
}: ValidatorComparisonProps) {
  const formatAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  const formatCurrency = (amount: number) => {
    if (amount >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M`
    }
    if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`
    }
    return amount.toFixed(2)
  }

  if (validators.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-muted-foreground">Select validators to compare</p>
        </CardContent>
      </Card>
    )
  }

  const metrics = [
    { key: 'apy', label: 'APY', suffix: '%', higherIsBetter: true },
    { key: 'commission', label: 'Commission', suffix: '%', higherIsBetter: false },
    { key: 'uptime', label: 'Uptime', suffix: '%', higherIsBetter: true },
    { key: 'mevRewards', label: 'MEV Rewards', suffix: ' SOL', higherIsBetter: true },
    { key: 'reliability', label: 'Reliability', suffix: '', higherIsBetter: true },
  ]

  const getBestValue = (key: string, higherIsBetter: boolean) => {
    const values = validators.map(v => (v as any)[key])
    return higherIsBetter ? Math.max(...values) : Math.min(...values)
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Validator Comparison</CardTitle>
        <CardDescription>
          Compare key metrics across selected validators
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 text-sm font-medium">Metric</th>
                {validators.map((validator, index) => (
                  <th key={validator.address} className="text-center py-2 px-4">
                    <div className="space-y-1">
                      <div className="text-sm font-medium">{validator.name}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {formatAddress(validator.address)}
                      </div>
                      {onRemove && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemove(validator.address)}
                          className="h-6 w-6 p-0"
                        >
                          <XCircle className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric) => {
                const bestValue = getBestValue(metric.key, metric.higherIsBetter)
                
                return (
                  <tr key={metric.key} className="border-b">
                    <td className="py-3 text-sm font-medium">{metric.label}</td>
                    {validators.map((validator) => {
                      const value = (validator as any)[metric.key]
                      const isBest = value === bestValue
                      const displayValue = metric.key === 'mevRewards' 
                        ? formatCurrency(value) 
                        : value.toFixed(metric.key === 'commission' || metric.key === 'apy' ? 2 : 1)
                      
                      return (
                        <td key={validator.address} className="py-3 px-4 text-center">
                          <span className={`text-sm ${isBest ? 'font-bold text-primary' : ''}`}>
                            {displayValue}{metric.suffix}
                            {isBest && <Star className="inline h-3 w-3 ml-1" />}
                          </span>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}