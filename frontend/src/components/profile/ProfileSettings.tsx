import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  User, 
  Mail, 
  Bell, 
  Shield, 
  Trash2, 
  Eye, 
  EyeOff,
  Star,
  Bookmark,
  AlertTriangle,
  Settings,
  Save,
  X
} from 'lucide-react'
import { useAuthStore, type UserRole } from '@/stores/authStore'

interface UserProfile {
  id: string
  name: string
  email: string
  role: UserRole
  walletAddress?: string
  avatar?: string
  timezone: string
  language: string
  createdAt: string
  lastLogin: string
}

interface NotificationSettings {
  emailNotifications: boolean
  pushNotifications: boolean
  mevOpportunityAlerts: boolean
  priceAlerts: boolean
  validatorAlerts: boolean
  weeklyReports: boolean
  securityAlerts: boolean
}

interface ValidatorWatchlistItem {
  id: string
  validatorId: string
  name: string
  publicKey: string
  commission: number
  isActive: boolean
  addedAt: string
  notes?: string
}

interface SavedAlert {
  id: string
  name: string
  type: 'mev_opportunity' | 'price_change' | 'validator_performance'
  conditions: any
  isActive: boolean
  createdAt: string
  lastTriggered?: string
}

export function ProfileSettings() {
  const { user, setUser } = useAuthStore()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailNotifications: true,
    pushNotifications: false,
    mevOpportunityAlerts: true,
    priceAlerts: false,
    validatorAlerts: true,
    weeklyReports: true,
    securityAlerts: true
  })
  const [watchlist, setWatchlist] = useState<ValidatorWatchlistItem[]>([])
  const [savedAlerts, setSavedAlerts] = useState<SavedAlert[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  useEffect(() => {
    loadProfileData()
  }, [])

  const loadProfileData = async () => {
    setIsLoading(true)
    try {
      // TODO: Implement API calls
      // Mock data for now
      if (user) {
        setProfile({
          id: user.id,
          name: user.email.split('@')[0],
          email: user.email,
          role: user.role,
          walletAddress: user.walletAddress,
          timezone: 'America/New_York',
          language: 'en',
          createdAt: user.createdAt,
          lastLogin: new Date().toISOString()
        })
      }

      setWatchlist([
        {
          id: 'w1',
          validatorId: 'val_123',
          name: 'Solana Foundation',
          publicKey: 'De2bU64vsXKU9jq4bCjeDxNRGPn8nr3euaTK8jBYmD6J',
          commission: 5,
          isActive: true,
          addedAt: '2024-01-01T00:00:00Z',
          notes: 'High performance validator'
        },
        {
          id: 'w2',
          validatorId: 'val_456',
          name: 'Stake Systems',
          publicKey: 'StakeSSCS2qbkdQXq5rR6LFLbVSfqvvjc6iRFZdaNfDB',
          commission: 3,
          isActive: true,
          addedAt: '2024-01-05T00:00:00Z'
        }
      ])

      setSavedAlerts([
        {
          id: 'alert_1',
          name: 'High Value Arbitrage',
          type: 'mev_opportunity',
          conditions: { minProfit: 1.0, maxRisk: 5 },
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          lastTriggered: '2024-01-15T10:30:00Z'
        },
        {
          id: 'alert_2',
          name: 'SOL Price Drop',
          type: 'price_change',
          conditions: { symbol: 'SOL', changePercent: -10 },
          isActive: false,
          createdAt: '2024-01-10T00:00:00Z'
        }
      ])
    } catch (error) {
      console.error('Failed to load profile data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleProfileUpdate = async (updates: Partial<UserProfile>) => {
    setIsLoading(true)
    try {
      // TODO: Implement profile update API call
      console.log('Updating profile:', updates)
      if (profile) {
        setProfile({ ...profile, ...updates })
      }
    } catch (error) {
      console.error('Failed to update profile:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleNotificationUpdate = async (setting: keyof NotificationSettings, value: boolean) => {
    try {
      // TODO: Implement notification settings API call
      setNotifications(prev => ({ ...prev, [setting]: value }))
    } catch (error) {
      console.error('Failed to update notifications:', error)
    }
  }

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('Passwords do not match')
      return
    }

    setIsLoading(true)
    try {
      // TODO: Implement password change API call
      console.log('Changing password')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setShowPasswordForm(false)
    } catch (error) {
      console.error('Failed to change password:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const removeFromWatchlist = async (itemId: string) => {
    try {
      // TODO: Implement watchlist removal API call
      setWatchlist(prev => prev.filter(item => item.id !== itemId))
    } catch (error) {
      console.error('Failed to remove from watchlist:', error)
    }
  }

  const toggleAlert = async (alertId: string) => {
    try {
      // TODO: Implement alert toggle API call
      setSavedAlerts(prev => prev.map(alert => 
        alert.id === alertId ? { ...alert, isActive: !alert.isActive } : alert
      ))
    } catch (error) {
      console.error('Failed to toggle alert:', error)
    }
  }

  const deleteAlert = async (alertId: string) => {
    if (!confirm('Are you sure you want to delete this alert?')) return

    try {
      // TODO: Implement alert deletion API call
      setSavedAlerts(prev => prev.filter(alert => alert.id !== alertId))
    } catch (error) {
      console.error('Failed to delete alert:', error)
    }
  }

  const handleAccountDeletion = async () => {
    const confirmation = prompt('Type "DELETE" to confirm account deletion:')
    if (confirmation !== 'DELETE') return

    setIsLoading(true)
    try {
      // TODO: Implement account deletion API call
      console.log('Deleting account')
    } catch (error) {
      console.error('Failed to delete account:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!profile) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile Information
          </CardTitle>
          <CardDescription>
            Update your personal information and account settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <input
                type="text"
                className="input"
                value={profile.name}
                onChange={(e) => setProfile(prev => prev ? { ...prev, name: e.target.value } : null)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
                className="input"
                value={profile.email}
                onChange={(e) => setProfile(prev => prev ? { ...prev, email: e.target.value } : null)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <div className="p-2">
                <Badge className="capitalize">{profile.role}</Badge>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Timezone</label>
              <select
                className="input"
                value={profile.timezone}
                onChange={(e) => setProfile(prev => prev ? { ...prev, timezone: e.target.value } : null)}
              >
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </div>

          {profile.walletAddress && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Connected Wallet</label>
              <code className="block p-2 bg-muted rounded text-sm font-mono">
                {profile.walletAddress}
              </code>
            </div>
          )}

          <Button onClick={() => handleProfileUpdate(profile)} disabled={isLoading}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Settings
          </CardTitle>
          <CardDescription>
            Manage your account security and password
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showPasswordForm ? (
            <Button variant="outline" onClick={() => setShowPasswordForm(true)}>
              Change Password
            </Button>
          ) : (
            <div className="space-y-4 border border-border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Change Password</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPasswordForm(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Current Password</label>
                  <input
                    type="password"
                    className="input"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">New Password</label>
                  <input
                    type="password"
                    className="input"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Confirm New Password</label>
                  <input
                    type="password"
                    className="input"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  />
                </div>

                <Button onClick={handlePasswordChange} disabled={isLoading}>
                  Update Password
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Configure how you want to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(notifications).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium capitalize">
                    {key.replace(/([A-Z])/g, ' $1').toLowerCase()}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {key === 'emailNotifications' && 'Receive notifications via email'}
                    {key === 'pushNotifications' && 'Receive browser push notifications'}
                    {key === 'mevOpportunityAlerts' && 'Get alerted about MEV opportunities'}
                    {key === 'priceAlerts' && 'Receive price change notifications'}
                    {key === 'validatorAlerts' && 'Get updates about your watched validators'}
                    {key === 'weeklyReports' && 'Receive weekly performance reports'}
                    {key === 'securityAlerts' && 'Important security notifications'}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => handleNotificationUpdate(key as keyof NotificationSettings, e.target.checked)}
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Validator Watchlist */}
      {profile.role === 'validator' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bookmark className="h-5 w-5" />
              Validator Watchlist
            </CardTitle>
            <CardDescription>
              Keep track of validators you're monitoring
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {watchlist.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{item.name}</h4>
                      <Badge variant={item.isActive ? 'default' : 'secondary'}>
                        {item.commission}% commission
                      </Badge>
                    </div>
                    <p className="text-xs font-mono text-muted-foreground mt-1">
                      {item.publicKey}
                    </p>
                    {item.notes && (
                      <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFromWatchlist(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {watchlist.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Bookmark className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No validators in your watchlist</p>
                  <p className="text-sm">Add validators to monitor their performance</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Saved Alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Saved Alerts
          </CardTitle>
          <CardDescription>
            Manage your custom alert conditions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {savedAlerts.map((alert) => (
              <div key={alert.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{alert.name}</h4>
                    <Badge variant={alert.isActive ? 'default' : 'secondary'}>
                      {alert.type.replace('_', ' ')}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Created {new Date(alert.createdAt).toLocaleDateString()}
                    {alert.lastTriggered && 
                      ` • Last triggered ${new Date(alert.lastTriggered).toLocaleDateString()}`
                    }
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleAlert(alert.id)}
                  >
                    {alert.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteAlert(alert.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {savedAlerts.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No saved alerts</p>
                <p className="text-sm">Create custom alerts to stay informed</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible and destructive actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
              <h4 className="font-medium text-destructive mb-2">Delete Account</h4>
              <p className="text-sm text-muted-foreground mb-4">
                Once you delete your account, there is no going back. This will permanently delete 
                your account, subscription, API keys, and all associated data.
              </p>
              <Button 
                variant="destructive" 
                onClick={handleAccountDeletion}
                disabled={isLoading}
              >
                Delete Account
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}