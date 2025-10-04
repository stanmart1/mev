import React, { useState, useEffect } from 'react';
import { Code, Play, Copy, Check } from 'lucide-react';
import apiService from '../../services/api';

export default function APIExplorer() {
  const [docs, setDocs] = useState(null);
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);
  const [testParams, setTestParams] = useState({});
  const [testBody, setTestBody] = useState('');
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadDocs();
  }, []);

  const loadDocs = async () => {
    try {
      const res = await apiService.get('/documentation/api-docs');
      setDocs(res.data);
    } catch (error) {
      console.error('Failed to load API docs:', error);
    }
  };

  const handleTest = async () => {
    if (!selectedEndpoint) return;
    
    setLoading(true);
    setResponse(null);
    
    try {
      let result;
      const params = new URLSearchParams(testParams).toString();
      const url = selectedEndpoint.path.replace('/api', '') + (params ? `?${params}` : '');
      
      if (selectedEndpoint.method === 'GET') {
        result = await apiService.get(url);
      } else {
        const body = testBody ? JSON.parse(testBody) : selectedEndpoint.body;
        result = await apiService.post(url, body);
      }
      
      setResponse({ success: true, data: result });
    } catch (error) {
      setResponse({ success: false, error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateCurlCommand = (endpoint) => {
    const params = Object.entries(testParams).map(([k, v]) => `${k}=${v}`).join('&');
    const url = `https://api.example.com${endpoint.path}${params ? `?${params}` : ''}`;
    
    if (endpoint.method === 'GET') {
      return `curl -X GET "${url}" \\\n  -H "Authorization: Bearer YOUR_API_KEY"`;
    }
    
    const body = testBody || JSON.stringify(endpoint.body, null, 2);
    return `curl -X ${endpoint.method} "${url}" \\\n  -H "Authorization: Bearer YOUR_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d '${body}'`;
  };

  if (!docs) return <div className="text-center py-12">Loading API documentation...</div>;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">API Explorer</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Interactive API documentation and testing tool
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 sticky top-4">
            <h2 className="text-lg font-bold mb-4">Endpoints</h2>
            <div className="space-y-4">
              {docs.endpoints.map(category => (
                <div key={category.category}>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {category.category}
                  </h3>
                  <div className="space-y-1">
                    {category.endpoints.map((endpoint, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedEndpoint(endpoint);
                          setTestParams({});
                          setTestBody(endpoint.body ? JSON.stringify(endpoint.body, null, 2) : '');
                          setResponse(null);
                        }}
                        className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                          selectedEndpoint === endpoint
                            ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        <span className={`font-mono font-bold mr-2 ${
                          endpoint.method === 'GET' ? 'text-green-600' : 'text-blue-600'
                        }`}>
                          {endpoint.method}
                        </span>
                        <span className="text-xs">{endpoint.path.split('/').pop()}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {selectedEndpoint ? (
            <>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className={`px-3 py-1 rounded font-mono font-bold text-sm ${
                    selectedEndpoint.method === 'GET' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                  }`}>
                    {selectedEndpoint.method}
                  </span>
                  <code className="text-sm font-mono">{selectedEndpoint.path}</code>
                </div>
                
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {selectedEndpoint.description}
                </p>

                {selectedEndpoint.auth && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded p-3 mb-4">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      🔒 Requires authentication
                    </p>
                  </div>
                )}

                {selectedEndpoint.params && selectedEndpoint.params.length > 0 && (
                  <div className="mb-4">
                    <h3 className="font-semibold mb-2">Parameters</h3>
                    <div className="space-y-2">
                      {selectedEndpoint.params.map(param => (
                        <div key={param.name} className="flex items-start gap-3">
                          <input
                            type="text"
                            placeholder={param.name}
                            value={testParams[param.name] || ''}
                            onChange={(e) => setTestParams({...testParams, [param.name]: e.target.value})}
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-sm"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-mono">{param.name}</p>
                            <p className="text-xs text-gray-500">{param.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedEndpoint.body && (
                  <div className="mb-4">
                    <h3 className="font-semibold mb-2">Request Body</h3>
                    <textarea
                      value={testBody}
                      onChange={(e) => setTestBody(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 font-mono text-sm"
                      rows={8}
                    />
                  </div>
                )}

                <button
                  onClick={handleTest}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
                >
                  <Play className="w-4 h-4" />
                  {loading ? 'Testing...' : 'Test Endpoint'}
                </button>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Code Example</h3>
                  <button
                    onClick={() => copyCode(generateCurlCommand(selectedEndpoint))}
                    className="flex items-center gap-2 px-3 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-x-auto text-sm">
                  <code>{generateCurlCommand(selectedEndpoint)}</code>
                </pre>
              </div>

              {response && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                  <h3 className="font-semibold mb-4">Response</h3>
                  <pre className={`p-4 rounded overflow-x-auto text-sm ${
                    response.success 
                      ? 'bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-100'
                      : 'bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100'
                  }`}>
                    <code>{JSON.stringify(response, null, 2)}</code>
                  </pre>
                </div>
              )}

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
                <h3 className="font-semibold mb-4">Expected Response</h3>
                <pre className="bg-gray-50 dark:bg-gray-900 p-4 rounded overflow-x-auto text-sm">
                  <code>{JSON.stringify(selectedEndpoint.response, null, 2)}</code>
                </pre>
              </div>
            </>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
              <Code className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600 dark:text-gray-400">
                Select an endpoint to view documentation and test it
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
