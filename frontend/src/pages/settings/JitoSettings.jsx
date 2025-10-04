import React, { useState, useEffect } from 'react';
import { Settings, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/common/Card';
import Button from '../../components/common/Button';
import apiService from '../../services/api';

export default function JitoSettings() {
  const [config, setConfig] = useState({
    enabled: false,
    blockEngineUrl: '',
    tipAccount: '',
    minTip: 10000,
    maxTip: 100000
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await apiService.get('/jito/status');
      setConfig({
        enabled: response.data.enabled,
        blockEngineUrl: response.data.blockEngineUrl || '',
        tipAccount: response.data.tipAccount || '',
        minTip: response.data.minTip || 10000,
        maxTip: response.data.maxTip || 100000
      });
      setStatus(response.data);
    } catch (error) {
      console.error('Failed to load Jito config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiService.post('/jito/configure', config);
      await loadConfig();
      alert('Jito configuration saved successfully');
    } catch (error) {
      console.error('Failed to save config:', error);
      alert('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Jito Configuration</h1>
        <p className="text-gray-600 dark:text-gray-400">Configure Jito Block Engine connection for MEV bundle submission</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div>
                <p className="font-medium">Jito Enabled</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {config.enabled ? 'Active' : 'Disabled'}
                </p>
              </div>
              {config.enabled ? (
                <CheckCircle className="w-6 h-6 text-green-500" />
              ) : (
                <XCircle className="w-6 h-6 text-gray-400" />
              )}
            </div>

            {status && (
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium">Authentication</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {status.authenticated ? 'Authenticated' : 'Not authenticated'}
                  </p>
                </div>
                {status.authenticated ? (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-yellow-500" />
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                  className="rounded"
                />
                <span className="text-sm font-medium">Enable Jito Integration</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Block Engine URL</label>
              <input
                type="text"
                value={config.blockEngineUrl}
                onChange={(e) => setConfig({ ...config, blockEngineUrl: e.target.value })}
                placeholder="https://mainnet.block-engine.jito.wtf"
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Tip Account</label>
              <input
                type="text"
                value={config.tipAccount}
                onChange={(e) => setConfig({ ...config, tipAccount: e.target.value })}
                placeholder="96gYZGLnJYVFmbjzopPSU6QiEV5fGqZNyN9nmNhvrZU5"
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Min Tip (lamports)</label>
                <input
                  type="number"
                  value={config.minTip}
                  onChange={(e) => setConfig({ ...config, minTip: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Max Tip (lamports)</label>
                <input
                  type="number"
                  value={config.maxTip}
                  onChange={(e) => setConfig({ ...config, maxTip: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
                />
              </div>
            </div>

            <div className="flex space-x-3">
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </Button>
              <Button variant="ghost" onClick={loadConfig}>
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p>• Jito Block Engine allows for optimized MEV bundle submission</p>
            <p>• Tips are paid to validators to prioritize your bundles</p>
            <p>• Authentication requires a keypair (configured via environment variables)</p>
            <p>• Min/Max tip values control the range of tips for bundle optimization</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
