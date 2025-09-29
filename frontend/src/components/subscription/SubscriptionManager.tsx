import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Crown, 
  Zap, 
  Shield, 
  Check, 
  X, 
  CreditCard, 
  Key, 
  Eye, 
  EyeOff,
  Copy,
  RefreshCw
} from 'lucide-react'

interface SubscriptionPlan {
  id: string
  name: string
  price: number
  interval: 'month' | 'year'
  features: string[]
  apiRequestsLimit: number
  realTimeUpdates: boolean
  supportLevel: 'basic' | 'priority' | 'dedicated'
  isPopular?: boolean
}

interface UserSubscription {
  id: string
  planId: string
  status: 'active' | 'canceled' | 'past_due' | 'unpaid'
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
}

interface APIKey {
  id: string
  name: string
  key: string
  lastUsed: string | null
  requestsUsed: number
  requestsLimit: number
  isActive: boolean
  createdAt: string
}

const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'basic',
    name: 'Basic',
    price: 0,
    interval: 'month',
    features: [
      '1,000 API requests/month',
      'Basic MEV opportunity detection',
      'Historical data (7 days)',
      'Community support'
    ],
    apiRequestsLimit: 1000,
    realTimeUpdates: false,
    supportLevel: 'basic'
  },
  {
    id: 'pro',
    name: 'Professional',
    price: 49,
    interval: 'month',
    features: [
      '50,000 API requests/month',
      'Real-time MEV opportunity feeds',
      'Advanced analytics & filters',
      'Historical data (90 days)',
      'Priority support',
      'Custom alerts'
    ],
    apiRequestsLimit: 50000,
    realTimeUpdates: true,
    supportLevel: 'priority',
    isPopular: true
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    interval: 'month',
    features: [
      'Unlimited API requests',
      'Real-time WebSocket feeds',
      'Full historical data',
      'Advanced MEV strategies',
      'Dedicated support',
      'Custom integrations',
      'White-label options'
    ],
    apiRequestsLimit: -1, // Unlimited
    realTimeUpdates: true,
    supportLevel: 'dedicated'
  }
]

export function SubscriptionManager() {
  const [currentSubscription, setCurrentSubscription] = useState<UserSubscription | null>(null)
  const [apiKeys, setApiKeys] = useState<APIKey[]>([])
  const [showApiKeys, setShowApiKeys] = useState<{ [key: string]: boolean }>({})
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    loadSubscriptionData()
  }, [])

  const loadSubscriptionData = async () => {
    setIsLoading(true)
    try {
      // TODO: Implement API calls
      // Mock data for now
      setCurrentSubscription({
        id: 'sub_123',
        planId: 'pro',
        status: 'active',
        currentPeriodStart: '2024-01-01',
        currentPeriodEnd: '2024-02-01',
        cancelAtPeriodEnd: false
      })

      setApiKeys([
        {
          id: 'key_1',
          name: 'Production API',
          key: 'mev_live_12345678901234567890123456789012',
          lastUsed: '2024-01-15T10:30:00Z',
          requestsUsed: 15420,
          requestsLimit: 50000,
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z'
        },
        {
          id: 'key_2',
          name: 'Development API',
          key: 'mev_test_09876543210987654321098765432109',
          lastUsed: null,
          requestsUsed: 0,
          requestsLimit: 50000,
          isActive: true,
          createdAt: '2024-01-10T00:00:00Z'
        }
      ])
    } catch (error) {
      console.error('Failed to load subscription data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePlanChange = async (planId: string) => {
    setIsLoading(true)
    try {
      // TODO: Implement plan change API call
      console.log('Changing plan to:', planId)
    } catch (error) {
      console.error('Failed to change plan:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will lose access to premium features at the end of your billing period.')) {
      return
    }

    setIsLoading(true)
    try {
      // TODO: Implement cancellation API call
      console.log('Canceling subscription')
    } catch (error) {
      console.error('Failed to cancel subscription:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateApiKey = async (name: string) => {
    setIsLoading(true)
    try {
      // TODO: Implement API key generation
      console.log('Generating new API key:', name)
    } catch (error) {
      console.error('Failed to generate API key:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const revokeApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return
    }

    setIsLoading(true)
    try {
      // TODO: Implement API key revocation
      console.log('Revoking API key:', keyId)
    } catch (error) {
      console.error('Failed to revoke API key:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // TODO: Show toast notification
  }

  const toggleApiKeyVisibility = (keyId: string) => {
    setShowApiKeys(prev => ({ ...prev, [keyId]: !prev[keyId] }))
  }

  const currentPlan = SUBSCRIPTION_PLANS.find(plan => plan.id === currentSubscription?.planId)
  const isBasicPlan = currentPlan?.id === 'basic'

  return (
    <div className="space-y-6">
      {/* Current Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Current Subscription
          </CardTitle>
          <CardDescription>
            Manage your subscription plan and billing information
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentPlan && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{currentPlan.name} Plan</h3>
                    {currentPlan.isPopular && (
                      <Badge className="bg-primary text-primary-foreground">
                        <Crown className="h-3 w-3 mr-1" />
                        Popular
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {currentPlan.price === 0 ? 'Free' : `$${currentPlan.price}/${currentPlan.interval}`}
                  </p>
                </div>
                
                <Badge 
                  variant={currentSubscription?.status === 'active' ? 'default' : 'destructive'}
                >
                  {currentSubscription?.status}
                </Badge>
              </div>

              {currentSubscription && currentSubscription.status === 'active' && (
                <div className="text-sm text-muted-foreground">
                  {currentSubscription.cancelAtPeriodEnd ? (
                    <p>Your subscription will end on {new Date(currentSubscription.currentPeriodEnd).toLocaleDateString()}</p>
                  ) : (
                    <p>Next billing date: {new Date(currentSubscription.currentPeriodEnd).toLocaleDateString()}</p>
                  )}
                </div>
              )}

              {!isBasicPlan && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleCancelSubscription}
                  disabled={isLoading}
                >
                  Cancel Subscription
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Plans */}
      <Card>
        <CardHeader>
          <CardTitle>Available Plans</CardTitle>
          <CardDescription>Upgrade or downgrade your subscription</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SUBSCRIPTION_PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`relative border border-border rounded-lg p-4 ${
                  plan.id === currentPlan?.id ? 'border-primary bg-primary/5' : ''
                } ${plan.isPopular ? 'border-primary' : ''}`}
              >
                {plan.isPopular && (
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      <Crown className="h-3 w-3 mr-1" />
                      Popular
                    </Badge>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                    <div className="text-2xl font-bold">
                      {plan.price === 0 ? 'Free' : `$${plan.price}`}
                      {plan.price > 0 && <span className="text-sm font-normal text-muted-foreground">/{plan.interval}</span>}
                    </div>
                  </div>

                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full"
                    variant={plan.id === currentPlan?.id ? 'outline' : 'default'}
                    disabled={plan.id === currentPlan?.id || isLoading}
                    onClick={() => handlePlanChange(plan.id)}
                  >
                    {plan.id === currentPlan?.id ? 'Current Plan' : 
                     plan.price > (currentPlan?.price || 0) ? 'Upgrade' : 'Downgrade'}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* API Keys Management */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Keys
              </CardTitle>
              <CardDescription>
                Manage your API keys for accessing MEV Analytics services
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => generateApiKey('New API Key')}>
              Generate New Key
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {apiKeys.map((apiKey) => (
              <div key={apiKey.id} className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-medium">{apiKey.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      Created {new Date(apiKey.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={apiKey.isActive ? 'default' : 'secondary'}>
                      {apiKey.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => revokeApiKey(apiKey.id)}
                    >
                      Revoke
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 bg-muted rounded text-sm font-mono">
                      {showApiKeys[apiKey.id] 
                        ? apiKey.key 
                        : apiKey.key.substring(0, 8) + '...' + apiKey.key.substring(apiKey.key.length - 4)
                      }
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => toggleApiKeyVisibility(apiKey.id)}
                    >
                      {showApiKeys[apiKey.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(apiKey.key)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      Usage: {apiKey.requestsUsed.toLocaleString()} / {
                        apiKey.requestsLimit === -1 ? 'Unlimited' : apiKey.requestsLimit.toLocaleString()
                      } requests
                    </span>
                    <span>
                      Last used: {apiKey.lastUsed 
                        ? new Date(apiKey.lastUsed).toLocaleDateString()
                        : 'Never'
                      }
                    </span>
                  </div>

                  {apiKey.requestsLimit > 0 && (
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${Math.min((apiKey.requestsUsed / apiKey.requestsLimit) * 100, 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}

            {apiKeys.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Key className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No API keys created yet</p>
                <p className="text-sm">Generate your first API key to get started</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}