import React, { useState, useEffect } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Play, Save, Download, GripVertical } from 'lucide-react';
import apiService from '../../services/api';

const SortableTransaction = ({ transaction, index, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: transaction.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="p-4 border rounded-lg bg-blue-50 border-blue-200">
      <div className="flex justify-between items-start">
        <div className="flex items-start gap-2 flex-1">
          <div {...attributes} {...listeners} className="cursor-move mt-1">
            <GripVertical className="w-4 h-4 text-gray-400" />
          </div>
          <div className="flex-1">
            <div className="font-medium">#{index + 1} {transaction.type}</div>
            <div className="text-sm text-gray-600">
              {transaction.tokenA} → {transaction.tokenB}
            </div>
            <div className="text-sm text-green-600">
              ${transaction.estimatedProfit?.toFixed(2) || 0}
            </div>
          </div>
        </div>
        <button onClick={() => onRemove(index)} className="text-red-500 hover:text-red-700 text-xl">
          ×
        </button>
      </div>
    </div>
  );
};

const OpportunityCard = ({ opportunity, onAdd }) => {
  return (
    <div
      onClick={() => onAdd(opportunity)}
      className="p-4 border rounded-lg cursor-pointer bg-gray-50 border-gray-200 hover:border-gray-300 hover:bg-gray-100 transition-colors"
    >
      <div className="flex justify-between items-start mb-2">
        <span className={`px-2 py-1 text-xs rounded ${
          opportunity.type === 'arbitrage' ? 'bg-green-100 text-green-800' :
          opportunity.type === 'liquidation' ? 'bg-red-100 text-red-800' :
          'bg-yellow-100 text-yellow-800'
        }`}>
          {opportunity.type}
        </span>
        <span className="text-sm font-medium text-green-600">
          ${opportunity.estimatedProfit?.toFixed(2) || 0}
        </span>
      </div>
      <div className="text-sm text-gray-600">
        {opportunity.tokenA} → {opportunity.tokenB}
      </div>
      <div className="text-xs text-gray-500 mt-1">
        Risk: {opportunity.riskLevel} | Gas: {opportunity.estimatedGas || 0}
      </div>
    </div>
  );
};

const BundleBuilder = () => {
  const [opportunities, setOpportunities] = useState([]);
  const [bundleTransactions, setBundleTransactions] = useState([]);
  const [bundleMetrics, setBundleMetrics] = useState({
    totalProfit: 0,
    totalGas: 0,
    successProbability: 0,
    riskLevel: 'Low'
  });
  const [settings, setSettings] = useState({
    slippageTolerance: 0.5,
    gasPrice: 'medium'
  });
  const [isSimulating, setIsSimulating] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor));

  useEffect(() => {
    fetchOpportunities();
  }, []);

  useEffect(() => {
    calculateBundleMetrics();
  }, [bundleTransactions, settings]);

  const fetchOpportunities = async () => {
    try {
      const response = await apiService.get('/opportunities');
      setOpportunities((response.data || []).map(opp => ({ ...opp, id: opp.id || `opp-${Date.now()}-${Math.random()}` })));
    } catch (error) {
      console.error('Failed to fetch opportunities:', error);
    }
  };

  const calculateBundleMetrics = () => {
    if (bundleTransactions.length === 0) {
      setBundleMetrics({ totalProfit: 0, totalGas: 0, successProbability: 0, riskLevel: 'Low' });
      return;
    }

    const totalProfit = bundleTransactions.reduce((sum, tx) => sum + (tx.estimatedProfit || 0), 0);
    const totalGas = bundleTransactions.reduce((sum, tx) => sum + (tx.estimatedGas || 0), 0);
    const avgRisk = bundleTransactions.reduce((sum, tx) => sum + getRiskScore(tx.riskLevel), 0) / bundleTransactions.length;
    
    setBundleMetrics({
      totalProfit: totalProfit * (1 - settings.slippageTolerance / 100),
      totalGas,
      successProbability: Math.max(0, 95 - (avgRisk * 10) - (bundleTransactions.length * 5)),
      riskLevel: avgRisk > 2 ? 'High' : avgRisk > 1 ? 'Medium' : 'Low'
    });
  };

  const getRiskScore = (level) => {
    switch (level) {
      case 'High': return 3;
      case 'Medium': return 2;
      default: return 1;
    }
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      setBundleTransactions((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const addOpportunity = (opportunity) => {
    setBundleTransactions(prev => [...prev, { ...opportunity, id: `tx-${Date.now()}-${Math.random()}` }]);
  };

  const removeTransaction = (index) => {
    setBundleTransactions(prev => prev.filter((_, i) => i !== index));
  };

  const simulateBundle = async () => {
    setIsSimulating(true);
    try {
      const response = await apiService.post('/bundles/simulate', {
        transactions: bundleTransactions,
        settings
      });
      alert(`Simulation complete! Expected profit: $${response.data.expectedProfit?.toFixed(2) || 0}`);
    } catch (error) {
      alert('Simulation failed: ' + error.message);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Bundle Builder</h1>
          <p className="text-gray-600">Construct and optimize MEV bundles with drag-and-drop interface</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Opportunities Panel */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Available Opportunities</h2>
            <div className="space-y-3">
              {opportunities.map((opportunity) => (
                <OpportunityCard key={opportunity.id} opportunity={opportunity} onAdd={addOpportunity} />
              ))}
            </div>
          </div>

          {/* Bundle Construction */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Bundle Transactions</h2>
            {bundleTransactions.length === 0 ? (
              <div className="flex items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-lg">
                <p className="text-gray-500">Click opportunities to add to bundle</p>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={bundleTransactions.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {bundleTransactions.map((transaction, index) => (
                      <SortableTransaction
                        key={transaction.id}
                        transaction={transaction}
                        index={index}
                        onRemove={removeTransaction}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </div>

          {/* Bundle Metrics & Controls */}
          <div className="space-y-6">
            {/* Metrics */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Bundle Metrics</h2>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Profit:</span>
                  <span className="font-semibold text-green-600">
                    ${bundleMetrics.totalProfit.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Gas:</span>
                  <span className="font-semibold">{bundleMetrics.totalGas.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Success Rate:</span>
                  <span className="font-semibold">{bundleMetrics.successProbability.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Risk Level:</span>
                  <span className={`font-semibold ${
                    bundleMetrics.riskLevel === 'High' ? 'text-red-600' :
                    bundleMetrics.riskLevel === 'Medium' ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    {bundleMetrics.riskLevel}
                  </span>
                </div>
              </div>
            </div>

            {/* Settings */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Slippage Tolerance (%)
                  </label>
                  <input
                    type="number"
                    value={settings.slippageTolerance}
                    onChange={(e) => setSettings(prev => ({ ...prev, slippageTolerance: parseFloat(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    step="0.1"
                    min="0"
                    max="10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Gas Price
                  </label>
                  <select
                    value={settings.gasPrice}
                    onChange={(e) => setSettings(prev => ({ ...prev, gasPrice: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="space-y-3">
                <button
                  onClick={simulateBundle}
                  disabled={bundleTransactions.length === 0 || isSimulating}
                  className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-4 h-4 mr-2" />
                  {isSimulating ? 'Simulating...' : 'Simulate Bundle'}
                </button>
                <button className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
                  <Save className="w-4 h-4 mr-2" />
                  Save Template
                </button>
                <button className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50">
                  <Download className="w-4 h-4 mr-2" />
                  Export Bundle
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BundleBuilder;