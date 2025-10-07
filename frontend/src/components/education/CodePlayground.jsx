import { useState } from 'react';
import { Play, Copy, Check } from 'lucide-react';

const CodePlayground = ({ initialCode, language = 'javascript', readOnly = false }) => {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState('');
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);

  const runCode = () => {
    setRunning(true);
    setOutput('');
    
    try {
      const logs = [];
      const customConsole = {
        log: (...args) => logs.push(args.join(' ')),
        error: (...args) => logs.push('Error: ' + args.join(' '))
      };
      
      const func = new Function('console', code);
      func(customConsole);
      
      setOutput(logs.join('\n') || 'Code executed successfully');
    } catch (error) {
      setOutput(`Error: ${error.message}`);
    } finally {
      setRunning(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
      <div className="flex items-center justify-between bg-gray-800 px-4 py-2 border-b border-gray-700">
        <span className="text-sm text-gray-400">{language}</span>
        <div className="flex gap-2">
          <button onClick={copyCode} className="p-2 hover:bg-gray-700 rounded">
            {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} className="text-gray-400" />}
          </button>
          {!readOnly && (
            <button onClick={runCode} disabled={running} className="flex items-center gap-2 px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm disabled:opacity-50">
              <Play size={14} />
              {running ? 'Running...' : 'Run'}
            </button>
          )}
        </div>
      </div>
      
      <textarea value={code} onChange={(e) => setCode(e.target.value)} readOnly={readOnly} className="w-full p-4 bg-gray-900 text-gray-100 font-mono text-sm resize-none focus:outline-none" rows={10} spellCheck={false} />
      
      {output && (
        <div className="border-t border-gray-700 bg-gray-950 p-4">
          <div className="text-xs text-gray-400 mb-2">Output:</div>
          <pre className="text-sm text-gray-300 font-mono whitespace-pre-wrap">{output}</pre>
        </div>
      )}
    </div>
  );
};

export default CodePlayground;
