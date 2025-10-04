import React, { useState, useEffect } from 'react';
import { User, Mail, Key, Bell, Star, CreditCard, Save, Trash2, Plus } from 'lucide-react';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import { useAuth } from '../../contexts/AuthContext';
import apiService from '../../services/api';

export default function ProfilePage() {
  const { user, updateUser, preferences, updatePreferences } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'api-keys', label: 'API Keys', icon: Key },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'favorites', label: 'Favorites', icon: Star },
    { id: 'subscription', label: 'Subscription', icon: CreditCard }
  ];

  const ProfileTab = () => {
    const [formData, setFormData] = useState({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });

    const handleSave = async () => {
      setLoading(true);
      setMessage('');

      try {
        const updateData = {
          firstName: formData.firstName,
          lastName: formData.lastName
        };

        if (formData.newPassword) {
          if (formData.newPassword !== formData.confirmPassword) {
            setMessage('New passwords do not match');
            setLoading(false);
            return;
          }
          updateData.currentPassword = formData.currentPassword;
          updateData.newPassword = formData.newPassword;
        }

        const response = await apiService.client.put('/profile', updateData);
        if (response.success) {
          updateUser(response.data.user);
          setMessage('Profile updated successfully');
          setFormData({ ...formData, currentPassword: '', newPassword: '', confirmPassword: '' });
        }
      } catch (error) {
        setMessage('Failed to update profile');
      }
      setLoading(false);
    };

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              First Name
            </label>
            <input
              type="text"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Last Name
            </label>
            <input
              type="text"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email
          </label>
          <input
            type="email"
            value={formData.email}
            disabled
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
          />
          <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Change Password
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={formData.currentPassword}
                onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
        </div>

        <Button onClick={handleSave} loading={loading} className="w-full">
          <Save className="w-4 h-4 mr-2" />
          Save Changes
        </Button>
      </div>
    );
  };

  const ApiKeysTab = () => {
    const [apiKeys, setApiKeys] = useState([]);
    const [newKeyName, setNewKeyName] = useState('');
    const [selectedPlan, setSelectedPlan] = useState('developer');

    useEffect(() => {
      loadApiKeys();
    }, []);

    const loadApiKeys = async () => {
      try {
        const response = await apiService.client.get('/auth/api-keys');
        if (response.success) {
          setApiKeys(response.data);
        }
      } catch (error) {
        console.error('Failed to load API keys:', error);
      }
    };

    const generateApiKey = async () => {
      if (!newKeyName.trim()) return;

      setLoading(true);
      try {
        const response = await apiService.client.post('/auth/api-keys', {
          name: newKeyName,
          plan: selectedPlan
        });
        if (response.success) {
          setApiKeys([...apiKeys, response.data]);
          setNewKeyName('');
          setMessage('API key generated successfully');
        }
      } catch (error) {
        setMessage('Failed to generate API key');
      }
      setLoading(false);
    };

    const revokeApiKey = async (keyId) => {
      setLoading(true);
      try {
        const response = await apiService.client.delete(`/auth/api-keys/${keyId}`);
        if (response.success) {
          setApiKeys(apiKeys.filter(key => key.id !== keyId));
          setMessage('API key revoked successfully');
        }
      } catch (error) {
        setMessage('Failed to revoke API key');
      }
      setLoading(false);
    };

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            API Keys
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Generate API keys to access MEV Analytics programmatically
          </p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Key Name
              </label>
              <input
                type="text"
                placeholder="My API Key"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Plan
              </label>
              <select
                value={selectedPlan}
                onChange={(e) => setSelectedPlan(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="free">Free (100 req/day)</option>
                <option value="developer">Developer (10k req/day)</option>
                <option value="professional">Professional (100k req/day)</option>
                <option value="enterprise">Enterprise (Unlimited)</option>
              </select>
            </div>
          </div>
          <Button onClick={generateApiKey} loading={loading} disabled={!newKeyName.trim()}>
            <Plus className="w-4 h-4 mr-2" />
            Generate API Key
          </Button>
        </div>

        <div className="space-y-3">
          {apiKeys.map((key) => (
            <div key={key.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium text-gray-900 dark:text-gray-100">{key.name}</p>
                  <span className="px-2 py-1 text-xs bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded">
                    {key.plan}
                  </span>
                </div>
                <p className="text-sm text-gray-500 font-mono">{key.key_preview || `${key.key?.slice(0, 8)}...${key.key?.slice(-8)}`}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Created: {new Date(key.created_at).toLocaleDateString()}
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => revokeApiKey(key.id)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {apiKeys.length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No API keys generated yet
            </div>
          )}
        </div>
      </div>
    );
  };

  const NotificationsTab = () => {
    const { preferences, updatePreferences } = useAuth();
    const [notificationSettings, setNotificationSettings] = useState({
      email: preferences?.notifications?.email || true,
      push: preferences?.notifications?.push || true,
      mevAlerts: preferences?.notifications?.mevAlerts || true,
      validatorUpdates: preferences?.notifications?.validatorUpdates || false,
      weeklyReports: preferences?.notifications?.weeklyReports || true
    });

    const handleSave = () => {
      updatePreferences({
        notifications: notificationSettings
      });
      setMessage('Notification preferences updated');
    };

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Notification Preferences
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Choose how you want to be notified about MEV opportunities and updates
          </p>
        </div>

        <div className="space-y-4">
          {[
            { key: 'email', label: 'Email Notifications', desc: 'Receive notifications via email' },
            { key: 'push', label: 'Push Notifications', desc: 'Browser push notifications' },
            { key: 'mevAlerts', label: 'MEV Opportunity Alerts', desc: 'Get notified of high-profit opportunities' },
            { key: 'validatorUpdates', label: 'Validator Performance Updates', desc: 'Updates on your favorite validators' },
            { key: 'weeklyReports', label: 'Weekly Reports', desc: 'Weekly summary of MEV activity' }
          ].map((setting) => (
            <div key={setting.key} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">{setting.label}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{setting.desc}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationSettings[setting.key]}
                  onChange={(e) => setNotificationSettings({
                    ...notificationSettings,
                    [setting.key]: e.target.checked
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
              </label>
            </div>
          ))}
        </div>

        <Button onClick={handleSave} className="w-full">
          <Save className="w-4 h-4 mr-2" />
          Save Preferences
        </Button>
      </div>
    );
  };

  const FavoritesTab = () => {
    const { preferences, updatePreferences } = useAuth();
    const [favorites, setFavorites] = useState(preferences?.alertThresholds?.favoriteValidators || []);
    const [newValidator, setNewValidator] = useState('');
    const [alertThresholds, setAlertThresholds] = useState({
      minProfit: preferences?.alertThresholds?.minProfit || 0.01,
      maxRisk: preferences?.alertThresholds?.maxRisk || 7
    });

    const addValidator = () => {
      if (newValidator.trim() && !favorites.includes(newValidator.trim())) {
        const updated = [...favorites, newValidator.trim()];
        setFavorites(updated);
        setNewValidator('');
        updatePreferences({
          alertThresholds: {
            ...alertThresholds,
            favoriteValidators: updated
          }
        });
      }
    };

    const removeValidator = (validator) => {
      const updated = favorites.filter(v => v !== validator);
      setFavorites(updated);
      updatePreferences({
        alertThresholds: {
          ...alertThresholds,
          favoriteValidators: updated
        }
      });
    };

    const saveThresholds = () => {
      updatePreferences({
        alertThresholds: {
          ...alertThresholds,
          favoriteValidators: favorites
        }
      });
      setMessage('Alert thresholds updated');
    };

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Favorites & Alert Thresholds
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage your favorite validators and set alert thresholds
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Alert Thresholds
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Minimum Profit (SOL)
                </label>
                <input
                  type="number"
                  step="0.001"
                  value={alertThresholds.minProfit}
                  onChange={(e) => setAlertThresholds({
                    ...alertThresholds,
                    minProfit: parseFloat(e.target.value)
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Maximum Risk Score (1-10)
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={alertThresholds.maxRisk}
                  onChange={(e) => setAlertThresholds({
                    ...alertThresholds,
                    maxRisk: parseInt(e.target.value)
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Favorite Validators
            </label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Validator address or name"
                value={newValidator}
                onChange={(e) => setNewValidator(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addValidator()}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <Button onClick={addValidator} disabled={!newValidator.trim()}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="space-y-2">
              {favorites.map((validator) => (
                <div key={validator} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                  <span className="font-mono text-sm text-gray-900 dark:text-gray-100">
                    {validator.length > 20 ? `${validator.slice(0, 8)}...${validator.slice(-8)}` : validator}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeValidator(validator)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {favorites.length === 0 && (
                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                  No favorite validators added yet
                </div>
              )}
            </div>
          </div>
        </div>

        <Button onClick={saveThresholds} className="w-full">
          <Save className="w-4 h-4 mr-2" />
          Save Settings
        </Button>
      </div>
    );
  };

  const SubscriptionTab = () => {
    const currentPlan = user?.subscription || 'free';
    const plans = [
      {
        id: 'free',
        name: 'Free',
        price: '$0',
        features: ['Basic MEV detection', '100 API calls/day', 'Email support']
      },
      {
        id: 'developer',
        name: 'Developer',
        price: '$29',
        features: ['Advanced analytics', '10k API calls/day', 'Real-time alerts', 'Priority support']
      },
      {
        id: 'professional',
        name: 'Professional',
        price: '$99',
        features: ['Full analytics suite', '100k API calls/day', 'Custom alerts', 'Phone support']
      },
      {
        id: 'enterprise',
        name: 'Enterprise',
        price: 'Custom',
        features: ['Unlimited access', 'Custom integrations', 'Dedicated support', 'SLA guarantee']
      }
    ];

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            Subscription Plan
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Choose the plan that best fits your needs
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`p-4 border rounded-lg ${
                currentPlan === plan.id
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900 dark:text-gray-100">{plan.name}</h4>
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{plan.price}</span>
                {currentPlan === plan.id && (
                  <span className="px-2 py-1 text-xs bg-primary-600 text-white rounded">
                    Current
                  </span>
                )}
              </div>
              <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <span className="w-1 h-1 bg-primary-600 rounded-full mr-2"></span>
                    {feature}
                  </li>
                ))}
              </ul>
              {currentPlan !== plan.id && (
                <Button className="w-full mt-4" variant="outline">
                  {plan.id === 'enterprise' ? 'Contact Sales' : 'Upgrade'}
                </Button>
              )}
            </div>
          ))}
        </div>

        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Usage This Month</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">API Calls</span>
              <span className="text-gray-900 dark:text-gray-100">2,847 / 10,000</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div className="bg-primary-600 h-2 rounded-full" style={{ width: '28.47%' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage your account settings and preferences
        </p>
      </div>

      {message && (
        <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
          <p className="text-sm text-blue-600 dark:text-blue-400">{message}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-3" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="lg:col-span-3">
          <Card className="p-6">
            {activeTab === 'profile' && <ProfileTab />}
            {activeTab === 'api-keys' && <ApiKeysTab />}
            {activeTab === 'notifications' && <NotificationsTab />}
            {activeTab === 'favorites' && <FavoritesTab />}
            {activeTab === 'subscription' && <SubscriptionTab />}
          </Card>
        </div>
      </div>
    </div>
  );
}