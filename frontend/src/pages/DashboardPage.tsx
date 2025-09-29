import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/stores/authStore'
import { OpportunityFeed } from '@/components/mev/OpportunityFeed'
import { useMEVOpportunities } from '@/hooks/useMEVOpportunities'
import { useValidatorPerformance } from '@/hooks/useValidatorPerformance'
import { useMarketData } from '@/hooks/useMarketData'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Activity, Users, DollarSign } from 'lucide-react'

export function DashboardPage() {
  const { user } = useAuthStore()
  
  // Use WebSocket hooks for live data
  const { opportunities, totalCount } = useMEVOpportunities({
    maxOpportunities: 5
  })
  
  const { validators, loading: validatorLoading } = useValidatorPerformance()
  
  const { prices, loading: marketLoading } = useMarketData()

  const getDashboardContent = () => {
    switch (user?.role) {
      case 'validator':
        const topValidator = validators?.[0]
        return (
          <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Validator Performance
                  {validatorLoading && <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />}
                </CardTitle>
                <CardDescription>Your validator's current performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {topValidator ? `${(topValidator.performance * 100).toFixed(1)}%` : '99.8%'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {topValidator ? 'Current performance' : 'Uptime percentage'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  MEV Rewards
                </CardTitle>
                <CardDescription>Total MEV rewards earned this epoch</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {topValidator ? `${topValidator.mevRewards.toFixed(1)} SOL` : '12.4 SOL'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {topValidator && topValidator.mevRewards > 10 
                    ? `+${((topValidator.mevRewards - 10) / 10 * 100).toFixed(1)}% from last epoch`
                    : '+15% from last epoch'
                  }
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Delegation Analytics
                </CardTitle>
                <CardDescription>Current delegated stake amount</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {topValidator ? `${(topValidator.stakeAmount / 1000).toFixed(0)}K SOL` : '1,250K SOL'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {validators ? `Across ${validators.length} validators` : 'Across 1,847 delegators'}
                </p>
              </CardContent>
            </Card>
          </div>
        )
      case 'searcher':
        return (
          <div className="space-y-6">
            <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Live Opportunities
                  </CardTitle>
                  <CardDescription>Current MEV opportunities available</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {opportunities?.length || 0}
                    {totalCount > 0 && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        {totalCount} total
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Arbitrage opportunities
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Profit Today
                  </CardTitle>
                  <CardDescription>Total profit captured today</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">8.7 SOL</div>
                  <p className="text-xs text-muted-foreground">+22% from yesterday</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Success Rate
                  </CardTitle>
                  <CardDescription>Execution success rate this week</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">87%</div>
                  <p className="text-xs text-muted-foreground">156 successful executions</p>
                </CardContent>
              </Card>
            </div>
            
            {/* Live Opportunity Feed */}
            <OpportunityFeed 
              className="w-full"
              onExecute={(opportunity) => {
                console.log('Execute opportunity:', opportunity)
                // TODO: Implement opportunity execution
              }}
            />
          </div>
        )
      case 'researcher':
        const solPrice = prices?.find(p => p.symbol === 'SOL')
        return (
          <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Network MEV Volume
                  {marketLoading && <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />}
                </CardTitle>
                <CardDescription>Total MEV volume in the last 24h</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {solPrice ? `${(solPrice.volume24h * 0.15).toFixed(0)} SOL` : '15,420 SOL'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {solPrice && solPrice.changePercent24h 
                    ? `${solPrice.changePercent24h > 0 ? '+' : ''}${solPrice.changePercent24h.toFixed(1)}% from previous day`
                    : '+8.3% from previous day'
                  }
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Active Validators
                </CardTitle>
                <CardDescription>MEV-enabled validators currently active</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {validators ? validators.length : '1,247'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {validators ? `${Math.round(validators.length / 1800 * 100)}% of total validators` : '68% of total validators'}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Market Efficiency
                </CardTitle>
                <CardDescription>Current market efficiency score</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">94.2%</div>
                <p className="text-xs text-muted-foreground">Highly efficient</p>
              </CardContent>
            </Card>
          </div>
        )
      default:
        return (
          <Card>
            <CardHeader>
              <CardTitle>Welcome to MEV Analytics</CardTitle>
              <CardDescription>Select a role to get started</CardDescription>
            </CardHeader>
          </Card>
        )
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to your {user?.role} dashboard. Here's an overview of your MEV analytics.
        </p>
      </div>
      {getDashboardContent()}
    </div>
  )
}