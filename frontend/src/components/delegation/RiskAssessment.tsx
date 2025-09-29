import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Button } from '../ui/button';
import { useWebSocket } from '@/hooks/useWebSocket';
import { 
  AlertTriangle,
  Shield,
  TrendingDown,
  TrendingUp,
  Activity,
  Clock,
  Users,
  Server,
  Wifi,
  AlertCircle,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

interface RiskFactor {
  category: string;
  score: number;
  weight: number;
  description: string;
  status: 'good' | 'warning' | 'critical';
  details: string[];
}

interface ValidatorRiskAssessment {
  validatorPubkey: string;
  validatorName: string;
  overallRiskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  factors: RiskFactor[];
  historicalData: {
    riskTrend: number;
    volatilityScore: number;
    stabilityRating: number;
  };
  recommendations: string[];
  lastUpdated: string;
}

interface RiskAssessmentProps {
  validatorPubkey: string;
  className?: string;
}

export const RiskAssessment: React.FC<RiskAssessmentProps> = ({
  validatorPubkey,
  className = ''
}) => {
  const [riskData, setRiskData] = useState<ValidatorRiskAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { isConnected, subscribe, send } = useWebSocket();

  const getRiskLevelConfig = (level: string) => {
    const configs = {
      low: { 
        color: 'bg-green-500', 
        textColor: 'text-green-700', 
        bgColor: 'bg-green-50 dark:bg-green-900/20',
        icon: CheckCircle2 
      },
      medium: { 
        color: 'bg-yellow-500', 
        textColor: 'text-yellow-700', 
        bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
        icon: AlertTriangle 
      },
      high: { 
        color: 'bg-orange-500', 
        textColor: 'text-orange-700', 
        bgColor: 'bg-orange-50 dark:bg-orange-900/20',
        icon: AlertTriangle 
      },
      critical: { 
        color: 'bg-red-500', 
        textColor: 'text-red-700', 
        bgColor: 'bg-red-50 dark:bg-red-900/20',
        icon: AlertCircle 
      }
    };
    return configs[level as keyof typeof configs] || configs.medium;
  };

  const getFactorIcon = (category: string) => {
    const icons: Record<string, React.ComponentType<{ className?: string }>> = {
      'Performance': Activity,
      'Uptime': Clock,
      'Network': Wifi,
      'Infrastructure': Server,
      'Delegation': Users,
      'Stability': Shield
    };
    return icons[category] || AlertTriangle;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      good: 'text-green-600',
      warning: 'text-yellow-600',
      critical: 'text-red-600'
    };
    return colors[status as keyof typeof colors] || 'text-gray-600';
  };

  const fetchRiskAssessment = async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/validators/${validatorPubkey}/risk-assessment`);
      if (!response.ok) throw new Error('Failed to fetch risk assessment');
      
      const data = await response.json();
      setRiskData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (validatorPubkey) {
      fetchRiskAssessment();
    }
  }, [validatorPubkey]);

  useEffect(() => {
    if (isConnected && validatorPubkey) {
      const unsubscribe = subscribe('risk_assessment', (data: any) => {
        if (data.validatorPubkey === validatorPubkey) {
          setRiskData(data);
          setLoading(false);
        }
      });
      return unsubscribe;
    }
  }, [isConnected, validatorPubkey, subscribe]);

  useEffect(() => {
    if (isConnected && validatorPubkey) {
      send({
        action: 'subscribe',
        channel: 'risk_assessment',
        validatorPubkey
      });
    }
  }, [isConnected, validatorPubkey, send]);

  if (loading) {
    return (
      <Card className={`${className} animate-pulse`}>
        <CardHeader>
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`${className} border-red-200`}>
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <p className="text-red-600 font-medium">Failed to load risk assessment</p>
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            <Button onClick={fetchRiskAssessment} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!riskData) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-gray-500">No risk assessment data available</p>
        </CardContent>
      </Card>
    );
  }

  const riskConfig = getRiskLevelConfig(riskData.riskLevel);
  const RiskIcon = riskConfig.icon;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Risk Assessment
            </CardTitle>
            <CardDescription>
              Comprehensive risk analysis for {riskData.validatorName || 'validator'}
            </CardDescription>
          </div>
          <Button onClick={fetchRiskAssessment} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Risk Score */}
        <div className={`p-4 rounded-lg ${riskConfig.bgColor}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <RiskIcon className={`h-6 w-6 ${riskConfig.textColor}`} />
              <h3 className="text-lg font-semibold">Overall Risk Score</h3>
            </div>
            <Badge className={`${riskConfig.color} text-white`}>
              {riskData.riskLevel.toUpperCase()} RISK
            </Badge>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold mb-1">
                {riskData.overallRiskScore.toFixed(1)}
              </div>
              <p className="text-sm text-gray-600">Risk Score</p>
              <Progress 
                value={100 - riskData.overallRiskScore} 
                className="h-3 mt-2" 
              />
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold mb-1 flex items-center justify-center gap-1">
                {riskData.historicalData.riskTrend > 0 ? (
                  <TrendingUp className="h-5 w-5 text-red-500" />
                ) : (
                  <TrendingDown className="h-5 w-5 text-green-500" />
                )}
                {Math.abs(riskData.historicalData.riskTrend).toFixed(1)}%
              </div>
              <p className="text-sm text-gray-600">Risk Trend</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold mb-1">
                {riskData.historicalData.stabilityRating.toFixed(1)}
              </div>
              <p className="text-sm text-gray-600">Stability Rating</p>
              <Progress 
                value={riskData.historicalData.stabilityRating} 
                className="h-3 mt-2" 
              />
            </div>
          </div>
        </div>

        {/* Risk Factors Breakdown */}
        <div>
          <h4 className="text-lg font-semibold mb-4">Risk Factors Analysis</h4>
          <div className="space-y-4">
            {riskData.factors.map((factor, index) => {
              const FactorIcon = getFactorIcon(factor.category);
              return (
                <Card key={index} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <FactorIcon className="h-5 w-5 text-blue-600" />
                      <div>
                        <h5 className="font-medium">{factor.category}</h5>
                        <p className="text-sm text-gray-600">{factor.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${getStatusColor(factor.status)}`}>
                        {factor.score.toFixed(1)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Weight: {(factor.weight * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                  
                  <Progress 
                    value={100 - factor.score} 
                    className="h-2 mb-3" 
                  />
                  
                  <div className="space-y-1">
                    {factor.details.map((detail, detailIndex) => (
                      <div key={detailIndex} className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                        {detail}
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Historical Risk Metrics */}
        <div>
          <h4 className="text-lg font-semibold mb-4">Risk History & Trends</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 text-center">
              <Activity className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold mb-1">
                {riskData.historicalData.volatilityScore.toFixed(1)}
              </div>
              <p className="text-sm text-gray-600">Volatility Score</p>
              <p className="text-xs text-gray-500 mt-1">
                Lower is better
              </p>
            </Card>
            
            <Card className="p-4 text-center">
              <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold mb-1">
                {riskData.historicalData.stabilityRating.toFixed(1)}%
              </div>
              <p className="text-sm text-gray-600">Stability Rating</p>
              <p className="text-xs text-gray-500 mt-1">
                Higher is better
              </p>
            </Card>
            
            <Card className="p-4 text-center">
              <Shield className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold mb-1">
                {(100 - riskData.overallRiskScore).toFixed(1)}%
              </div>
              <p className="text-sm text-gray-600">Safety Score</p>
              <p className="text-xs text-gray-500 mt-1">
                Risk inverse
              </p>
            </Card>
          </div>
        </div>

        {/* Recommendations */}
        <div>
          <h4 className="text-lg font-semibold mb-4">Risk Mitigation Recommendations</h4>
          <div className="space-y-3">
            {riskData.recommendations.map((recommendation, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm">{recommendation}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Last Updated */}
        <div className="text-xs text-gray-500 text-center border-t pt-4">
          Risk assessment last updated: {new Date(riskData.lastUpdated).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
};