import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, ArrowRight, CheckCircle } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const SkillAssessment = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [completed, setCompleted] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!user) {
      alert('Please login to take the skill assessment');
      navigate('/education');
      return;
    }
    loadAssessment();
  }, [user]);

  const loadAssessment = async () => {
    try {
      const response = await api.get('/education/skill-assessment');
      setQuestions(response.data.questions || []);
    } catch (error) {
      console.error('Failed to load assessment:', error);
    }
  };

  const handleAnswer = (questionId, answerIndex) => {
    setAnswers({ ...answers, [questionId]: answerIndex });
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      submitAssessment();
    }
  };

  const submitAssessment = async () => {
    try {
      if (!user) {
        alert('Please login to submit assessment');
        navigate('/login');
        return;
      }
      const response = await api.post('/education/skill-assessment/submit', { answers });
      setResult(response.data || response);
      setCompleted(true);
    } catch (error) {
      console.error('Failed to submit assessment:', error);
      const errorMsg = error.response?.data?.message || error.message || 'Failed to submit assessment';
      alert(errorMsg);
    }
  };

  if (!questions.length) {
    return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading...</div>;
  }

  if (completed && result) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-3xl mx-auto">
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <CheckCircle className="w-20 h-20 text-green-400 mx-auto mb-6" />
            <h1 className="text-3xl font-bold mb-4">Assessment Complete!</h1>
            
            <div className="bg-gray-700 rounded-lg p-6 mb-6">
              <div className="text-5xl font-bold text-blue-400 mb-2">{result.skillLevel}</div>
              <div className="text-gray-400">Your Skill Level</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="font-semibold mb-2 text-green-400">Strong Areas</h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  {result.strongAreas?.map((area, i) => (
                    <li key={i}>• {area}</li>
                  ))}
                </ul>
              </div>
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="font-semibold mb-2 text-yellow-400">Areas to Improve</h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  {result.weakAreas?.map((area, i) => (
                    <li key={i}>• {area}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="bg-blue-900 rounded-lg p-4 mb-6">
              <h3 className="font-semibold mb-2">Recommended Learning Path</h3>
              <p className="text-sm text-gray-300">
                We've created a personalized learning path based on your assessment. 
                Start with the recommended modules to build your MEV expertise.
              </p>
            </div>

            <button
              onClick={() => navigate('/education')}
              className="px-8 py-3 bg-blue-600 rounded-lg hover:bg-blue-500 font-semibold flex items-center gap-2 mx-auto"
            >
              View Your Learning Path
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const question = questions[currentQuestion];
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-3xl mx-auto">
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Brain className="text-blue-400" size={32} />
            <div>
              <h1 className="text-2xl font-bold">Skill Assessment</h1>
              <p className="text-gray-400">Question {currentQuestion + 1} of {questions.length}</p>
            </div>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-6">{question.question}</h2>
          <div className="space-y-3">
            {question.options.map((option, idx) => (
              <label
                key={idx}
                className={`flex items-center gap-3 p-4 rounded cursor-pointer transition-all ${
                  answers[question.id] === idx
                    ? 'bg-blue-600 border-2 border-blue-400'
                    : 'bg-gray-700 hover:bg-gray-600 border-2 border-transparent'
                }`}
              >
                <input
                  type="radio"
                  name={`q${question.id}`}
                  checked={answers[question.id] === idx}
                  onChange={() => handleAnswer(question.id, idx)}
                  className="w-5 h-5"
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleNext}
            disabled={answers[question.id] === undefined}
            className="px-8 py-3 bg-blue-600 rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold"
          >
            {currentQuestion === questions.length - 1 ? 'Complete Assessment' : 'Next Question'}
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SkillAssessment;
