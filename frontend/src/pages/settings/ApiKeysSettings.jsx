import React, { useState, useEffect } from 'react';
import { Key, Eye, EyeOff, Save, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import Button from '../../components/common/Button';
import apiService from '../../services/api';

const SERVICES = [
  {
    id: 'solana',
    name: 'Solana RPC',
    description: 'Custom Solana RPC endpoint for faster transaction processing',
    fields: [
      { key: 'SOLANA_RPC_URL', label: 'RPC URL', type: 'url', placeholder: 'https://api.mainnet-beta.solana.com' },
      { key: 'SOLANA_WS_URL', label: 'WebSocket URL', type: 'url', placeholder: 'wss://api.mainnet-beta.solana.com' }
    ]
  },
  {
    id: 'jito',
    name: 'Jito Block Engine',
    description: 'MEV bundle submission via Jito',
    fields: [
      { key: 'JITO_BLOCK_ENGINE_URL', label: 'Block Engine URL', type: 'url', placeholder: 'https://mainnet.block-engine.jito.wtf' },
      { key: 'JITO_AUTH_KEYPAIR', label: 'Auth Keypair (JSON)', type: 'password', placeholder: '[1,2,3,...]' },
      { key: 'JITO_TIP_ACCOUNT', label: 'Tip Account', type: 'text', placeholder: '96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5' }
    ]
  },
  {
    id: 'helius',
    name: 'Helius',
    description: 'Enhanced Solana RPC with webhooks and analytics',
    fields: [
      { key: 'HELIUS_API_KEY', label: 'API Key', type: 'password', placeholder: 'your-helius-api-key' },
      { key: 'HELIUS_RPC_URL', label: 'RPC URL', type: 'url', placeholder: 'https://rpc.helius.xyz' }
    ]
  },
  {
    id: 'quicknode',
    name: 'QuickNode',
    description: 'High-performance blockchain infrastructure',
    fields: [
      { key: 'QUICKNODE_ENDPOINT', label: 'Endpoint URL', type: 'url', placeholder: 'https://your-endpoint.solana-mainnet.quiknode.pro' },
      { key: 'QUICKNODE_API_KEY', label: 'API Key', type: 'password', placeholder: 'your-quicknode-key' }
    ]
  },
  {
    id: 'birdeye',
    name: 'Birdeye',
    description: 'Token prices and market data',
    fields: [
      { key: 'BIRDEYE_API_KEY', label: 'API Key', type: 'password', placeholder: 'your-birdeye-api-key' }
    ]
  },
  {
    id: 'coingecko',
    name: 'CoinGecko',
    description: 'Cryptocurrency price data',
    fields: [
      { key: 'COINGECKO_API_KEY', label: 'API Key', type: 'password', placeholder: 'your-coingecko-api-key' }
    ]
  }
];

export default function ApiKeysSettings() {
  const [apiKeys, setApiKeys] = useState({});
  const [showKeys, setShowKeys] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testResults, setTestResults] = useState({});

  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    try {
      const response = await apiService.get('/settings/api-keys');
      setApiKeys(response.data || {});
    } catch (error) {
      console.error('Failed to load API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiService.post('/settings/api-keys', apiKeys);
      alert('API keys saved successfully');
    } catch (error) {
      console.error('Failed to save API keys:', error);
      alert('Failed to save API keys');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (serviceId) => {
    setTestResults({ ...testResults, [serviceId]: 'testing' });
    try {
      const response = await apiService.post(`/settings/api-keys/test/${serviceId}`);
      setTestResults({ ...testResults, [serviceId]: response.success ? 'success' : 'failed' });
    } catch (error) {
      setTestResults({ ...testResults, [serviceId]: 'failed' });
    }
  };

  const toggleShowKey = (key) => {
    setShowKeys({ ...showKeys, [key]: !showKeys[key] });
  };

  const updateKey = (key, value) => {
    setApiKeys({ ...apiKeys, [key]: value });
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">API Keys Management</h1>
          <p className="text-gray-600 dark:text-gray-400">Configure third-party service API keys</p>
        </div>
        <Button variant="primary" onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save All'}
        </Button>
      </div>

      <div className="space-y-4">
        {SERVICES.map((service) => (
          <Card key={service.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="w-5 h-5" />
                    {service.name}
                  </CardTitle>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {service.description}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {testResults[service.id] === 'testing' && (
                    <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                  )}
                  {testResults[service.id] === 'success' && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  {testResults[service.id] === 'failed' && (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTest(service.id)}
                    disabled={testResults[service.id] === 'testing'}
                  >
                    Test Connection
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {service.fields.map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm font-medium mb-2">
                      {field.label}
                    </label>
                    <div className="relative">
                      <input
                        type={field.type === 'password' && !showKeys[field.key] ? 'password' : 'text'}
                        value={apiKeys[field.key] || ''}
                        onChange={(e) => updateKey(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full px-3 py-2 pr-10 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                      />
                      {field.type === 'password' && (
                        <button
                          type="button"
                          onClick={() => toggleShowKey(field.key)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        >
                          {showKeys[field.key] ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Security Notice</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p>• API keys are encrypted and stored securely</p>
            <p>• Never share your API keys with anyone</p>
            <p>• Rotate keys regularly for better security</p>
            <p>• Test connections after updating keys</p>
            <p>• Some services may have rate limits</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
