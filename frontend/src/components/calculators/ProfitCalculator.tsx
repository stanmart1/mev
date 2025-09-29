import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Calculator, TrendingUp, AlertTriangle, DollarSign } from 'lucide-react'

interface ProfitCalculatorProps {
  title?: string
  type?: 'arbitrage' | 'liquidation' | 'sandwich'
  onCalculate?: (results: ProfitResults) => void
}

interface ProfitResults {
  grossProfit: number
  netProfit: number
  profitMargin: number
  gasCosts: number
  slippage: number
  riskScore: number
  roi: number
}

export function ProfitCalculator({ 
  title = "MEV Profit Calculator", 
  type = 'arbitrage',
  onCalculate 
}: ProfitCalculatorProps) {
  const [inputs, setInputs] = useState({
    tradeSize: 1000,
    buyPrice: 100,
    sellPrice: 102,
    gasPrice: 0.001,
    slippageTolerance: 0.5,
    competitionRisk: 3,
  })

  const [results, setResults] = useState<ProfitResults | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)

  const calculateProfit = () => {
    setIsCalculating(true)
    
    setTimeout(() => {
      const { tradeSize, buyPrice, sellPrice, gasPrice, slippageTolerance, competitionRisk } = inputs
      
      // Basic profit calculation
      const priceSpread = sellPrice - buyPrice
      const grossProfit = (priceSpread / buyPrice) * tradeSize
      
      // Calculate costs and risks
      const slippageCost = (slippageTolerance / 100) * tradeSize
      const gasCosts = gasPrice * 2 // Buy + Sell transactions
      const competitionCost = (competitionRisk / 10) * grossProfit * 0.1
      
      const netProfit = grossProfit - slippageCost - gasCosts - competitionCost
      const profitMargin = (netProfit / tradeSize) * 100
      const roi = (netProfit / tradeSize) * 100
      
      // Risk scoring (1-10)
      const riskScore = Math.min(10, Math.max(1, 
        (competitionRisk * 0.4) + 
        (slippageTolerance * 0.3) + 
        ((tradeSize / 10000) * 0.3)
      ))

      const calculatedResults: ProfitResults = {
        grossProfit,
        netProfit,
        profitMargin,
        gasCosts,
        slippage: slippageCost,
        riskScore,
        roi
      }

      setResults(calculatedResults)
      onCalculate?.(calculatedResults)
      setIsCalculating(false)
    }, 800)
  }

  const getRiskColor = (score: number) => {
    if (score <= 3) return 'text-green-500'
    if (score <= 6) return 'text-yellow-500'
    return 'text-red-500'
  }

  const getRiskLabel = (score: number) => {
    if (score <= 3) return 'Low Risk'
    if (score <= 6) return 'Medium Risk'
    return 'High Risk'
  }

  useEffect(() => {
    calculateProfit()
  }, [inputs])

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>
          Calculate potential profits and risks for {type} opportunities
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Trade Size (USD)</label>
            <Input
              type="number"
              value={inputs.tradeSize}
              onChange={(e) => setInputs(prev => ({ ...prev, tradeSize: Number(e.target.value) }))}
              placeholder="1000"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Buy Price (USD)</label>
            <Input
              type="number"
              step="0.01"
              value={inputs.buyPrice}
              onChange={(e) => setInputs(prev => ({ ...prev, buyPrice: Number(e.target.value) }))}
              placeholder="100.00"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Sell Price (USD)</label>
            <Input
              type="number"
              step="0.01"
              value={inputs.sellPrice}
              onChange={(e) => setInputs(prev => ({ ...prev, sellPrice: Number(e.target.value) }))}
              placeholder="102.00"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Gas Cost (SOL)</label>
            <Input
              type="number"
              step="0.0001"
              value={inputs.gasPrice}
              onChange={(e) => setInputs(prev => ({ ...prev, gasPrice: Number(e.target.value) }))}
              placeholder="0.001"
            />
          </div>
        </div>

        {/* Sliders */}
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-sm font-medium">Slippage Tolerance</label>
              <span className="text-sm text-muted-foreground">{inputs.slippageTolerance}%</span>
            </div>
            <Slider
              value={[inputs.slippageTolerance]}
              onValueChange={(value) => setInputs(prev => ({ ...prev, slippageTolerance: value[0] }))}
              max={5}
              min={0.1}
              step={0.1}
              className="w-full"
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between">
              <label className="text-sm font-medium">Competition Risk</label>
              <span className="text-sm text-muted-foreground">{inputs.competitionRisk}/10</span>
            </div>
            <Slider
              value={[inputs.competitionRisk]}
              onValueChange={(value) => setInputs(prev => ({ ...prev, competitionRisk: value[0] }))}
              max={10}
              min={1}
              step={1}
              className="w-full"
            />
          </div>
        </div>

        {/* Results */}
        {results && (
          <div className="mt-6 p-4 bg-muted/50 rounded-lg space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Profit Analysis
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Gross Profit</p>
                <p className="text-sm font-medium text-green-600">
                  ${results.grossProfit.toFixed(2)}
                </p>
              </div>
              
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Net Profit</p>
                <p className={`text-sm font-medium ${results.netProfit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${results.netProfit.toFixed(2)}
                </p>
              </div>
              
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">ROI</p>
                <p className={`text-sm font-medium ${results.roi > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {results.roi.toFixed(2)}%
                </p>
              </div>
              
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Risk Score</p>
                <Badge variant="outline" className={getRiskColor(results.riskScore)}>
                  {getRiskLabel(results.riskScore)}
                </Badge>
              </div>
            </div>

            {/* Cost Breakdown */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Cost Breakdown</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gas Costs:</span>
                  <span>-${results.gasCosts.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Slippage:</span>
                  <span>-${results.slippage.toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-1">
                  <span className="font-medium">Total Costs:</span>
                  <span className="font-medium">-${(results.gasCosts + results.slippage).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            {results.netProfit <= 0 && (
              <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-600">Unprofitable Trade</p>
                  <p className="text-yellow-600/80">Consider adjusting parameters or waiting for better opportunities.</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Calculate Button */}
        <Button 
          onClick={calculateProfit} 
          disabled={isCalculating}
          className="w-full"
        >
          {isCalculating ? (
            <>
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
              Calculating...
            </>
          ) : (
            <>
              <DollarSign className="mr-2 h-4 w-4" />
              Recalculate Profit
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}