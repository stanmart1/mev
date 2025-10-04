import React, { useState, useEffect } from 'react';
import apiService from '../services/api';

const CLUSTERS = [
  { id: 'mainnet-beta', name: 'Mainnet Beta', icon: '🟢' },
  { id: 'devnet', name: 'Devnet', icon: '🟡' },
  { id: 'testnet', name: 'Testnet', icon: '🔵' }
];

export default function ClusterSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentCluster, setCurrentCluster] = useState('devnet');

  useEffect(() => {
    loadCurrentCluster();
  }, []);

  const loadCurrentCluster = async () => {
    try {
      const response = await apiService.get('/cluster/current');
      setCurrentCluster(response.cluster || 'devnet');
    } catch (error) {
      console.error('Failed to load cluster:', error);
    }
  };

  const current = CLUSTERS.find(c => c.id === currentCluster) || CLUSTERS[1];

  const handleClusterChange = async (clusterId) => {
    if (clusterId === currentCluster || loading) return;

    setLoading(true);
    try {
      await apiService.post('/cluster/switch', { cluster: clusterId });
      setCurrentCluster(clusterId);
      setIsOpen(false);
      localStorage.setItem('solana_cluster', clusterId);
      window.location.reload();
    } catch (error) {
      console.error('Failed to switch cluster:', error);
      alert('Failed to switch cluster');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
        disabled={loading}
      >
        <span>{current.icon}</span>
        <span className="text-sm font-medium">{current.name}</span>
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 bg-gray-800 rounded-lg shadow-lg border border-gray-700 py-1 min-w-[160px] z-50">
          {CLUSTERS.map(cluster => (
            <button
              key={cluster.id}
              onClick={() => handleClusterChange(cluster.id)}
              disabled={loading || cluster.id === currentCluster}
              className={`w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-700 transition-colors ${
                cluster.id === currentCluster ? 'bg-gray-700 text-blue-400' : 'text-gray-300'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span>{cluster.icon}</span>
              <span>{cluster.name}</span>
              {cluster.id === currentCluster && <span className="ml-auto">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
