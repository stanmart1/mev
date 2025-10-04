import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, CheckCircle, Lightbulb } from 'lucide-react';
import Editor from '@monaco-editor/react';
import api from '../../services/api';

const TutorialView = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [tutorial, setTutorial] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [code, setCode] = useState('');
  const [testResults, setTestResults] = useState(null);
  const [showHints, setShowHints] = useState(false);
  const [revealedHints, setRevealedHints] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [quizPassed, setQuizPassed] = useState(false);
  const [liveData, setLiveData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const workerRef = React.useRef(null);

  useEffect(() => {
    loadTutorial();
    
    // Initialize Web Worker
    workerRef.current = new Worker('/code-executor.js');
    workerRef.current.onmessage = (e) => {
      setTestResults(e.data);
      setExecuting(false);
    };
    workerRef.current.onerror = (error) => {
      setTestResults([{ passed: false, error: error.message }]);
      setExecuting(false);
    };
    
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, [slug]);

  useEffect(() => {
    if (tutorial && currentStep < tutorial.steps.length) {
      const step = tutorial.steps[currentStep];
      if (step.step_type === 'code_playground') {
        setCode(step.content.starterCode || '');
      }
      if (step.step_type === 'live_data') {
        fetchLiveData(step.content.dataSource);
      }
    }
  }, [currentStep, tutorial]);

  const loadTutorial = async () => {
    try {
      const response = await api.get(`/education/tutorials/${slug}`);
      setTutorial(response.data);
    } catch (error) {
      console.error('Failed to load tutorial:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLiveData = async (dataSource) => {
    try {
      const response = await api.get(dataSource);
      setLiveData(response.data);
    } catch (error) {
      console.error('Failed to fetch live data:', error);
    }
  };

  const runCode = () => {
    if (executing) return;
    
    const step = tutorial.steps[currentStep];
    setExecuting(true);
    setTestResults(null);
    
    try {
      const testCases = step.content.testCases;
      
      // Send to Web Worker for safe execution
      workerRef.current.postMessage({ code, testCases });
      
      // Set timeout
      setTimeout(() => {
        if (executing) {
          setTestResults([{ passed: false, error: 'Execution timeout (5 seconds)' }]);
          setExecuting(false);
        }
      }, 5000);
    } catch (error) {
      setTestResults([{ passed: false, error: error.message }]);
      setExecuting(false);
    }
  };

  const handleNext = () => {
    if (currentStep < tutorial.steps.length - 1) {
      setCurrentStep(currentStep + 1);
      setTestResults(null);
      setShowHints(false);
      setRevealedHints(0);
      setSelectedAnswer(null);
      setQuizPassed(false);
    }
  };

  const revealNextHint = () => {
    if (step.hints && revealedHints < step.hints.length) {
      setRevealedHints(revealedHints + 1);
    }
  };

  const handleQuizSubmit = () => {
    const step = tutorial.steps[currentStep];
    const correct = step.content.questions[0].correct;
    setQuizPassed(selectedAnswer === correct);
  };

  if (loading) return <div className="p-8 text-gray-400">Loading...</div>;
  if (!tutorial) return <div className="p-8 text-gray-400">Tutorial not found</div>;

  const step = tutorial.steps[currentStep];
  const progress = ((currentStep + 1) / tutorial.steps.length) * 100;
  const allTestsPassed = testResults && testResults.every(r => r.passed);
  const canProceed = step.step_type === 'instruction' || 
                     (step.step_type === 'code_playground' && allTestsPassed) ||
                     (step.step_type === 'quiz_checkpoint' && quizPassed) ||
                     step.step_type === 'live_data';

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-6xl mx-auto p-6">
        <button onClick={() => navigate('/education')} className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-6">
          <ArrowLeft size={20} />
          Back to Learning Journey
        </button>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h1 className="text-3xl font-bold mb-2">{tutorial.title}</h1>
          <p className="text-gray-400 mb-4">{tutorial.description}</p>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span>⏱️ {tutorial.estimated_time} min</span>
            <span>📊 {tutorial.difficulty}</span>
            <span>⭐ {tutorial.xp_reward} XP</span>
            <span>Step {currentStep + 1} of {tutorial.steps.length}</span>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">{step.title}</h2>

          {step.step_type === 'instruction' && (
            <div className="prose prose-invert max-w-none">
              <p className="text-gray-300 mb-4">{step.content.text}</p>
              {step.content.keyPoints && (
                <div className="bg-gray-700 rounded p-4">
                  <h3 className="text-lg font-semibold mb-2">Key Points:</h3>
                  <ul className="space-y-2">
                    {step.content.keyPoints.map((point, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle size={16} className="text-green-400 mt-1 flex-shrink-0" />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {step.step_type === 'code_playground' && (
            <div>
              <p className="text-gray-300 mb-4">{step.content.instructions}</p>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-semibold">Your Code</label>
                    {step.hints && step.hints.length > 0 && (
                      <button onClick={revealNextHint} disabled={revealedHints >= step.hints.length} className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed">
                        <Lightbulb size={16} />
                        {revealedHints === 0 ? 'Show Hint' : revealedHints >= step.hints.length ? 'All Hints Shown' : `Show Next Hint (${revealedHints}/${step.hints.length})`}
                      </button>
                    )}
                  </div>
                  <Editor
                    height="300px"
                    language="javascript"
                    theme="vs-dark"
                    value={code}
                    onChange={(value) => setCode(value || '')}
                    options={{
                      minimap: { enabled: false },
                      fontSize: window.innerWidth < 768 ? 12 : 14,
                      lineNumbers: 'on',
                      scrollBeyondLastLine: false,
                      automaticLayout: true,
                      tabSize: 2,
                      wordWrap: 'on',
                      readOnly: false,
                      glyphMargin: false
                    }}
                  />
                  <button onClick={runCode} disabled={executing} className="mt-2 px-4 py-2 bg-green-600 rounded hover:bg-green-500 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                    <Play size={16} />
                    {executing ? 'Executing...' : 'Run Tests'}
                  </button>
                </div>
                <div className="mt-4 lg:mt-0">
                  <label className="text-sm font-semibold mb-2 block">Test Results</label>
                  <div className="bg-gray-900 rounded p-4 min-h-[200px] max-h-64 overflow-y-auto">
                    {testResults ? (
                      <div className="space-y-2">
                        {testResults.map((result, i) => (
                          <div key={i} className={`p-2 rounded ${result.passed ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                            {result.passed ? '✓' : '✗'} Test {i + 1}
                            {result.error && <div className="text-xs mt-1">{result.error}</div>}
                            {!result.passed && !result.error && (
                              <div className="text-xs mt-1">Expected: {JSON.stringify(result.expected)}, Got: {JSON.stringify(result.actual)}</div>
                            )}
                          </div>
                        ))}
                        {allTestsPassed && <div className="text-green-400 font-semibold mt-4">🎉 All tests passed!</div>}
                      </div>
                    ) : (
                      <div className="text-gray-500">Run tests to see results</div>
                    )}
                  </div>
                </div>
              </div>
              {revealedHints > 0 && step.hints && (
                <div className="mt-4 space-y-2">
                  {step.hints.slice(0, revealedHints).map((hint, i) => (
                    <div key={i} className="bg-blue-900 rounded p-3 animate-fade-in">
                      <div className="flex items-start gap-2">
                        <Lightbulb size={16} className="text-yellow-400 mt-1 flex-shrink-0" />
                        <div>
                          <span className="text-xs text-blue-300 font-semibold">Hint {i + 1}</span>
                          <p className="text-sm text-white mt-1">{hint}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step.step_type === 'quiz_checkpoint' && (
            <div>
              {step.content.questions.map((q, i) => (
                <div key={i} className="bg-gray-700 rounded p-4 mb-4">
                  <p className="font-semibold mb-3">{q.question}</p>
                  <div className="space-y-2">
                    {q.options.map((option, optIdx) => (
                      <label key={optIdx} className="flex items-center gap-3 p-3 bg-gray-800 rounded cursor-pointer hover:bg-gray-750">
                        <input type="radio" name={`q${i}`} checked={selectedAnswer === optIdx} onChange={() => setSelectedAnswer(optIdx)} className="w-4 h-4" />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                  {quizPassed !== null && (
                    <div className={`mt-3 p-3 rounded ${quizPassed ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                      {quizPassed ? '✓ Correct!' : '✗ Incorrect'} {q.explanation}
                    </div>
                  )}
                </div>
              ))}
              {selectedAnswer !== null && !quizPassed && (
                <button onClick={handleQuizSubmit} className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500">
                  Submit Answer
                </button>
              )}
            </div>
          )}

          {step.step_type === 'live_data' && (
            <div>
              <p className="text-gray-300 mb-4">{step.content.instructions}</p>
              <div className="bg-gray-900 rounded p-4 overflow-x-auto">
                {liveData ? (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-800">
                      <tr>
                        {step.content.displayFields?.map(field => (
                          <th key={field} className="p-2 text-left">{field}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(Array.isArray(liveData) ? liveData : liveData.opportunities || []).slice(0, 10).map((item, i) => (
                        <tr key={i} className="border-t border-gray-800">
                          {step.content.displayFields?.map(field => (
                            <td key={field} className="p-2">{item[field]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-gray-500">Loading live data...</div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-400">Progress</span>
            <span className="text-sm text-gray-400">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="flex justify-between">
          <button onClick={() => currentStep > 0 && setCurrentStep(currentStep - 1)} disabled={currentStep === 0} className="px-6 py-2 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">
            Previous
          </button>
          <button onClick={handleNext} disabled={!canProceed || currentStep === tutorial.steps.length - 1} className="px-6 py-2 bg-blue-600 rounded hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
            {currentStep === tutorial.steps.length - 1 ? 'Complete' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TutorialView;
