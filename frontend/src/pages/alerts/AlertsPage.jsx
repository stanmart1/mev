import React, { useState, useEffect } from 'react';
import { Bell, Plus, Trash2, TrendingUp, DollarSign, AlertTriangle, Activity, Package } from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

const ALERT_TYPES = [
  { id: 'profit', label: 'Profit Threshold', icon: DollarSign, color: 'green' },
  { id: 'validator', label: 'Validator Performance', icon: Activity, color: 'blue' },
  { id: 'price', label: 'Token Price', icon: TrendingUp, color: 'purple' },
  { id: 'liquidation', label: 'Liquidation Opportunity', icon: AlertTriangle, color: 'orange' },
  { id: 'bundle', label: 'Bundle Execution', icon: Package, color: 'indigo' }
];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAlert, setNewAlert] = useState({
    type: 'profit',
    name: '',
    enabled: true,
    conditions: {}
  });

  useEffect(() => {
    const stored = localStorage.getItem('mev_alerts');
    setAlerts(stored ? JSON.parse(stored) : []);
  }, []);

  const saveAlerts = (updatedAlerts) => {
    localStorage.setItem('mev_alerts', JSON.stringify(updatedAlerts));
    setAlerts(updatedAlerts);
  };

  const handleCreateAlert = () => {
    const alert = {
      ...newAlert,
      id: Date.now(),
      createdAt: new Date().toISOString()
    };
    saveAlerts([...alerts, alert]);
    setShowCreateModal(false);
    setNewAlert({ type: 'profit', name: '', enabled: true, conditions: {} });
  };

  const handleToggleAlert = (id) => {
    saveAlerts(alerts.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a));
  };

  const handleDeleteAlert = (id) => {
    if (confirm('Delete this alert?')) {
      saveAlerts(alerts.filter(a => a.id !== id));
    }
  };

  const renderConditionForm = () => {
    switch (newAlert.type) {
      case 'profit':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Minimum Profit (SOL)</label>
              <input
                type="number"
                step="0.01"
                value={newAlert.conditions.minProfit || ''}
                onChange={(e) => setNewAlert({
                  ...newAlert,
                  conditions: { ...newAlert.conditions, minProfit: parseFloat(e.target.value) }
                })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                placeholder="0.1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Opportunity Type</label>
              <select
                value={newAlert.conditions.opportunityType || 'all'}
                onChange={(e) => setNewAlert({
                  ...newAlert,
                  conditions: { ...newAlert.conditions, opportunityType: e.target.value }
                })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="all">All Types</option>
                <option value="arbitrage">Arbitrage</option>
                <option value="liquidation">Liquidation</option>
                <option value="sandwich">Sandwich</option>
              </select>
            </div>
          </div>
        );
      
      case 'validator':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Validator Address</label>
              <input
                type="text"
                value={newAlert.conditions.validatorAddress || ''}
                onChange={(e) => setNewAlert({
                  ...newAlert,
                  conditions: { ...newAlert.conditions, validatorAddress: e.target.value }
                })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                placeholder="Enter validator address"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Alert When</label>
              <select
                value={newAlert.conditions.metric || 'performance'}
                onChange={(e) => setNewAlert({
                  ...newAlert,
                  conditions: { ...newAlert.conditions, metric: e.target.value }
                })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="performance">Performance drops below</option>
                <option value="mev_rewards">MEV rewards exceed</option>
                <option value="commission">Commission changes</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Threshold Value</label>
              <input
                type="number"
                value={newAlert.conditions.threshold || ''}
                onChange={(e) => setNewAlert({
                  ...newAlert,
                  conditions: { ...newAlert.conditions, threshold: parseFloat(e.target.value) }
                })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                placeholder="90"
              />
            </div>
          </div>
        );
      
      case 'price':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Token Symbol</label>
              <input
                type="text"
                value={newAlert.conditions.tokenSymbol || ''}
                onChange={(e) => setNewAlert({
                  ...newAlert,
                  conditions: { ...newAlert.conditions, tokenSymbol: e.target.value.toUpperCase() }
                })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                placeholder="SOL"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Condition</label>
              <select
                value={newAlert.conditions.condition || 'above'}
                onChange={(e) => setNewAlert({
                  ...newAlert,
                  conditions: { ...newAlert.conditions, condition: e.target.value }
                })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="above">Price goes above</option>
                <option value="below">Price goes below</option>
                <option value="change">Price changes by</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                {newAlert.conditions.condition === 'change' ? 'Percentage (%)' : 'Price (USD)'}
              </label>
              <input
                type="number"
                step="0.01"
                value={newAlert.conditions.value || ''}
                onChange={(e) => setNewAlert({
                  ...newAlert,
                  conditions: { ...newAlert.conditions, value: parseFloat(e.target.value) }
                })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                placeholder={newAlert.conditions.condition === 'change' ? '5' : '100'}
              />
            </div>
          </div>
        );
      
      case 'liquidation':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Minimum Collateral Value (USD)</label>
              <input
                type="number"
                value={newAlert.conditions.minCollateral || ''}
                onChange={(e) => setNewAlert({
                  ...newAlert,
                  conditions: { ...newAlert.conditions, minCollateral: parseFloat(e.target.value) }
                })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                placeholder="1000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Protocol</label>
              <select
                value={newAlert.conditions.protocol || 'all'}
                onChange={(e) => setNewAlert({
                  ...newAlert,
                  conditions: { ...newAlert.conditions, protocol: e.target.value }
                })}
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="all">All Protocols</option>
                <option value="solend">Solend</option>
                <option value="mango">Mango Markets</option>
                <option value="port">Port Finance</option>
              </select>
            </div>
          </div>
        );
      
      case 'bundle':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Alert On</label>
              <div className="space-y-2">
                {['confirmed', 'failed', 'pending'].map(status => (
                  <label key={status} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newAlert.conditions[status] || false}
                      onChange={(e) => setNewAlert({
                        ...newAlert,
                        conditions: { ...newAlert.conditions, [status]: e.target.checked }
                      })}
                      className="w-4 h-4"
                    />
                    <span className="capitalize">{status} bundles</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  const getAlertTypeConfig = (type) => ALERT_TYPES.find(t => t.id === type);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Alert Configuration</h1>
          <p className="text-gray-600 dark:text-gray-400">Set up custom notifications for MEV opportunities</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Alert
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        {ALERT_TYPES.map(type => {
          const Icon = type.icon;
          const count = alerts.filter(a => a.type === type.id && a.enabled).length;
          return (
            <Card key={type.id} className="text-center">
              <Icon className={`w-8 h-8 mx-auto mb-2 text-${type.color}-500`} />
              <h3 className="font-semibold text-sm">{type.label}</h3>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{count}</p>
              <p className="text-xs text-gray-500">Active</p>
            </Card>
          );
        })}
      </div>

      <Card>
        <h2 className="text-lg font-semibold mb-4">Active Alerts ({alerts.length})</h2>
        {alerts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No alerts configured yet</p>
            <p className="text-sm">Create your first alert to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map(alert => {
              const typeConfig = getAlertTypeConfig(alert.type);
              const Icon = typeConfig?.icon || Bell;
              return (
                <div key={alert.id} className="flex items-center justify-between p-4 border rounded-lg dark:border-gray-700">
                  <div className="flex items-center gap-3 flex-1">
                    <Icon className={`w-5 h-5 text-${typeConfig?.color}-500`} />
                    <div className="flex-1">
                      <h3 className="font-semibold">{alert.name || `${typeConfig?.label} Alert`}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {typeConfig?.label} • Created {new Date(alert.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={alert.enabled}
                        onChange={() => handleToggleAlert(alert.id)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                    </label>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteAlert(alert.id)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Create New Alert</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Alert Name</label>
                <input
                  type="text"
                  value={newAlert.name}
                  onChange={(e) => setNewAlert({ ...newAlert, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  placeholder="My Alert"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Alert Type</label>
                <select
                  value={newAlert.type}
                  onChange={(e) => setNewAlert({ ...newAlert, type: e.target.value, conditions: {} })}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                >
                  {ALERT_TYPES.map(type => (
                    <option key={type.id} value={type.id}>{type.label}</option>
                  ))}
                </select>
              </div>

              {renderConditionForm()}
            </div>

            <div className="flex gap-3 mt-6">
              <Button onClick={handleCreateAlert} className="flex-1">
                Create Alert
              </Button>
              <Button variant="ghost" onClick={() => setShowCreateModal(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
