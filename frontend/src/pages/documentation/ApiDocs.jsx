import React, { useState } from 'react';
import { Code, Copy, Check, Book, Zap, Shield, Database } from 'lucide-react';
import Card from '../../components/common/Card';

const API_SECTIONS = [
  {
    id: 'auth',
    title: 'Authentication',
    icon: Shield,
    endpoints: [
      {
        method: 'POST',
        path: '/api/auth/register',
        description: 'Register a new user account',
        body: { email: 'user@example.com', password: 'password123', username: 'username' },
        response: { success: true, token: 'jwt_token', refreshToken: 'refresh_token' }
      },
      {
        method: 'POST',
        path: '/api/auth/login',
        description: 'Login to existing account',
        body: { email: 'user@example.com', password: 'password123' },
        response: { success: true, token: 'jwt_token', refreshToken: 'refresh_token' }
      },
      {
        method: 'POST',
        path: '/api/auth/refresh',
        description: 'Refresh access token',
        body: { refreshToken: 'refresh_token' },
        response: { success: true, token: 'new_jwt_token' }
      }
    ]
  },
  {
    id: 'opportunities',
    title: 'MEV Opportunities',
    icon: Zap,
    endpoints: [
      {
        method: 'GET',
        path: '/api/opportunities',
        description: 'Get all MEV opportunities',
        params: { type: 'arbitrage', minProfit: '0.01', limit: '50' },
        response: { success: true, data: { opportunities: [] } }
      },
      {
        method: 'GET',
        path: '/api/arbitrage/opportunities',
        description: 'Get arbitrage opportunities',
        response: { success: true, data: { opportunities: [] } }
      },
      {
        method: 'GET',
        path: '/api/liquidations',
        description: 'Get liquidation opportunities',
        response: { success: true, data: { opportunities: [] } }
      }
    ]
  },
  {
    id: 'bundles',
    title: 'Bundle Operations',
    icon: Database,
    endpoints: [
      {
        method: 'POST',
        path: '/api/bundles/simulate',
        description: 'Simulate bundle execution',
        body: { opportunities: [{ id: 'opp_123', opportunity_type: 'arbitrage' }] },
        response: { success: true, simulation: { estimatedProfit: 0.5, gasEstimate: 0.001 } }
      },
      {
        method: 'POST',
        path: '/api/bundles/execute',
        description: 'Execute bundle on-chain',
        body: { bundleId: 'bundle_123', tipAmount: 0.001 },
        response: { success: true, bundleId: 'bundle_123', status: 'pending' }
      },
      {
        method: 'GET',
        path: '/api/bundles/status/:bundleId',
        description: 'Get bundle execution status',
        response: { success: true, status: 'confirmed', signature: 'tx_signature' }
      }
    ]
  },
  {
    id: 'validators',
    title: 'Validator Analytics',
    icon: Database,
    endpoints: [
      {
        method: 'GET',
        path: '/api/validators',
        description: 'Get all validators',
        params: { limit: '100', sortBy: 'mev_rewards' },
        response: { success: true, data: { validators: [] } }
      },
      {
        method: 'GET',
        path: '/api/validators/:address',
        description: 'Get validator details',
        response: { success: true, data: { validator: {} } }
      }
    ]
  }
];

export default function ApiDocs() {
  const [activeSection, setActiveSection] = useState('auth');
  const [copiedCode, setCopiedCode] = useState(null);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const generateCurlCommand = (endpoint) => {
    let curl = `curl -X ${endpoint.method} ${window.location.origin}${endpoint.path}`;
    
    if (endpoint.method !== 'GET') {
      curl += ` \\\n  -H "Content-Type: application/json"`;
    }
    
    if (!endpoint.path.includes('auth')) {
      curl += ` \\\n  -H "Authorization: Bearer YOUR_TOKEN"`;
    }
    
    if (endpoint.body) {
      curl += ` \\\n  -d '${JSON.stringify(endpoint.body, null, 2)}'`;
    }
    
    if (endpoint.params) {
      const params = new URLSearchParams(endpoint.params).toString();
      curl = curl.replace(endpoint.path, `${endpoint.path}?${params}`);
    }
    
    return curl;
  };

  const activeEndpoints = API_SECTIONS.find(s => s.id === activeSection)?.endpoints || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Book className="w-8 h-8 text-primary-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">API Documentation</h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Complete reference for the MEV Analytics Platform API
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Endpoints</h3>
              <nav className="space-y-1">
                {API_SECTIONS.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                        activeSection === section.id
                          ? 'bg-primary-100 dark:bg-primary-900 text-primary-900 dark:text-primary-100'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{section.title}</span>
                    </button>
                  );
                })}
              </nav>
            </Card>
          </div>

          {/* Content */}
          <div className="lg:col-span-3 space-y-6">
            {activeEndpoints.map((endpoint, idx) => {
              const codeId = `${activeSection}-${idx}`;
              const curlCommand = generateCurlCommand(endpoint);
              
              return (
                <Card key={idx}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`px-2 py-1 text-xs font-bold rounded ${
                          endpoint.method === 'GET' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                          endpoint.method === 'POST' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {endpoint.method}
                        </span>
                        <code className="text-sm font-mono text-gray-900 dark:text-gray-100">
                          {endpoint.path}
                        </code>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {endpoint.description}
                      </p>
                    </div>
                  </div>

                  {/* Request Example */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                        Request
                      </h4>
                      <button
                        onClick={() => copyToClipboard(curlCommand, codeId)}
                        className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                      >
                        {copiedCode === codeId ? (
                          <>
                            <Check className="w-3 h-3" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Copy
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
                      <code>{curlCommand}</code>
                    </pre>
                  </div>

                  {/* Response Example */}
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      Response
                    </h4>
                    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
                      <code>{JSON.stringify(endpoint.response, null, 2)}</code>
                    </pre>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Getting Started */}
        <Card className="mt-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Getting Started</h2>
          <div className="space-y-4 text-sm text-gray-600 dark:text-gray-400">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Base URL</h3>
              <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                {window.location.origin}
              </code>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Authentication</h3>
              <p>Most endpoints require authentication. Include your JWT token in the Authorization header:</p>
              <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg mt-2 text-xs">
                Authorization: Bearer YOUR_JWT_TOKEN
              </pre>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">Rate Limiting</h3>
              <p>API requests are limited to 100 requests per minute per user.</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
