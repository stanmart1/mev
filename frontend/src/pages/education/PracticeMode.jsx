import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Code, Clock, Trophy, Zap, ArrowLeft } from 'lucide-react';
import Editor from '@monaco-editor/react';
import api from '../../services/api';

const PracticeMode = () => {
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState([]);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [code, setCode] = useState('');
  const [testResults, setTestResults] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  const [executing, setExecuting] = useState(false);
  const workerRef = React.useRef(null);

  useEffect(() => {
    loadChallenges();
    
    workerRef.current = new Worker('/code-executor.js');
    workerRef.current.onmessage = (e) => {
      setTestResults(e.data);
      setExecuting(false);
    };
    
    return () => {
      if (workerRef.current) workerRef.current.terminate();
    };
  }, []);

  useEffect(() => {
    if (selectedChallenge && selectedChallenge.time_limit) {
      setTimeLeft(selectedChallenge.time_limit);
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [selectedChallenge]);

  const loadChallenges = async () => {
    try {
      const response = await api.get('/education/challenges');
      setChallenges(response.data || []);
    } catch (error) {
      console.error('Failed to load challenges:', error);
    }
  };

  const selectChallenge = (challenge) => {
    setSelectedChallenge(challenge);
    setCode(challenge.starter_code);
    setTestResults(null);
    setTimeLeft(challenge.time_limit);
  };

  const runTests = () => {
    if (executing || !selectedChallenge) return;
    
    setExecuting(true);
    workerRef.current.postMessage({
      code,
      testCases: JSON.parse(selectedChallenge.test_cases)
    });
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!selectedChallenge) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-6xl mx-auto">
          <button onClick={() => navigate('/education')} className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-6">
            <ArrowLeft size={20} />
            Back to Learning Journey
          </button>

          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Practice Mode</h1>
            <p className="text-gray-400">Sharpen your skills with unlimited practice challenges</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {challenges.map(challenge => (
              <div
                key={challenge.id}
                onClick={() => selectChallenge(challenge)}
                className="bg-gray-800 rounded-lg p-6 cursor-pointer hover:bg-gray-750 border-2 border-transparent hover:border-blue-500 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <Code className="text-blue-400" size={24} />
                  <span className={`text-xs px-2 py-1 rounded ${
                    challenge.difficulty === 'beginner' ? 'bg-green-900 text-green-400' :
                    challenge.difficulty === 'intermediate' ? 'bg-yellow-900 text-yellow-400' :
                    'bg-red-900 text-red-400'
                  }`}>
                    {challenge.difficulty}
                  </span>
                </div>
                <h3 className="font-semibold text-lg mb-2">{challenge.title}</h3>
                <p className="text-sm text-gray-400 mb-4">{challenge.description}</p>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  {challenge.time_limit && (
                    <div className="flex items-center gap-1">
                      <Clock size={16} />
                      {Math.floor(challenge.time_limit / 60)}m
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Trophy size={16} />
                    {challenge.xp_reward} XP
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const allTestsPassed = testResults && testResults.every(r => r.passed);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <button onClick={() => setSelectedChallenge(null)} className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-6">
          <ArrowLeft size={20} />
          Back to Challenges
        </button>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold">{selectedChallenge.title}</h2>
              <p className="text-gray-400">{selectedChallenge.description}</p>
            </div>
            {timeLeft !== null && (
              <div className={`text-2xl font-bold ${timeLeft < 60 ? 'text-red-400' : 'text-blue-400'}`}>
                <Clock className="inline mr-2" size={24} />
                {formatTime(timeLeft)}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Your Solution</h3>
              <button
                onClick={runTests}
                disabled={executing || timeLeft === 0}
                className="px-4 py-2 bg-green-600 rounded hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Zap size={16} />
                {executing ? 'Running...' : 'Run Tests'}
              </button>
            </div>
            <Editor
              height="300px"
              language="javascript"
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                readOnly: timeLeft === 0
              }}
            />
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Test Results</h3>
            {testResults ? (
              <div className="space-y-2">
                {testResults.map((result, i) => (
                  <div key={i} className={`p-3 rounded ${result.passed ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                    {result.passed ? '✓' : '✗'} Test {i + 1}
                    {!result.passed && result.error && <div className="text-xs mt-1">{result.error}</div>}
                  </div>
                ))}
                {allTestsPassed && (
                  <div className="bg-blue-900 text-blue-300 p-4 rounded mt-4">
                    <Trophy className="inline mr-2" size={20} />
                    All tests passed! +{selectedChallenge.xp_reward} XP (Practice Mode - No XP awarded)
                  </div>
                )}
              </div>
            ) : (
              <div className="text-gray-500">Run tests to see results</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PracticeMode;
