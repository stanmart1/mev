import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Clock, CheckCircle, Lock, ArrowLeft, Download } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const Certifications = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [certifications, setCertifications] = useState([]);
  const [userCerts, setUserCerts] = useState([]);
  const [selectedCert, setSelectedCert] = useState(null);
  const [examStarted, setExamStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [examQuestions, setExamQuestions] = useState([]);

  useEffect(() => {
    loadCertifications();
    if (user) loadUserCertifications();
  }, [user]);

  useEffect(() => {
    if (examStarted && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            submitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [examStarted, timeLeft]);

  const loadCertifications = async () => {
    try {
      const response = await api.get('/education/certifications');
      setCertifications(response.data || []);
    } catch (error) {
      console.error('Failed to load certifications:', error);
    }
  };

  const loadUserCertifications = async () => {
    try {
      const response = await api.get('/education/my-certifications');
      setUserCerts(response.data || []);
    } catch (error) {
      console.error('Failed to load user certifications:', error);
    }
  };

  const startExam = async (cert) => {
    if (!user) {
      alert('Please login to take certification exams');
      return;
    }

    try {
      const response = await api.get(`/education/certifications/${cert.id}/exam`);
      setExamQuestions(response.data.questions || []);
      setSelectedCert(cert);
      setExamStarted(true);
      setCurrentQuestion(0);
      setAnswers({});
      setTimeLeft(cert.time_limit * 60);
    } catch (error) {
      console.error('Failed to start exam:', error);
      alert('Failed to start exam. Please try again.');
    }
  };

  const submitExam = async () => {
    try {
      const response = await api.post(`/education/certifications/${selectedCert.id}/submit`, {
        answers
      });
      
      setExamStarted(false);
      alert(`Exam completed! Score: ${response.data.score}% - ${response.data.passed ? 'PASSED ✓' : 'FAILED ✗'}`);
      
      if (response.data.passed) {
        loadUserCertifications();
      }
      
      setSelectedCert(null);
    } catch (error) {
      console.error('Failed to submit exam:', error);
      alert('Failed to submit exam. Please try again.');
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getUserCert = (certId) => {
    return userCerts.find(uc => uc.certification_id === certId);
  };

  if (examStarted && examQuestions.length > 0) {
    const question = examQuestions[currentQuestion];
    const progress = ((currentQuestion + 1) / examQuestions.length) * 100;

    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold">{selectedCert.name} Exam</h2>
                <p className="text-gray-400">Question {currentQuestion + 1} of {examQuestions.length}</p>
              </div>
              <div className={`text-2xl font-bold ${timeLeft < 300 ? 'text-red-400' : 'text-blue-400'}`}>
                <Clock className="inline mr-2" size={24} />
                {formatTime(timeLeft)}
              </div>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2 mb-6">
              <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-semibold mb-4">{question.question}</h3>
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
                    onChange={() => setAnswers({ ...answers, [question.id]: idx })}
                    className="w-5 h-5"
                  />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
              disabled={currentQuestion === 0}
              className="px-6 py-3 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50"
            >
              Previous
            </button>
            {currentQuestion === examQuestions.length - 1 ? (
              <button
                onClick={submitExam}
                className="px-6 py-3 bg-green-600 rounded hover:bg-green-500"
              >
                Submit Exam
              </button>
            ) : (
              <button
                onClick={() => setCurrentQuestion(Math.min(examQuestions.length - 1, currentQuestion + 1))}
                className="px-6 py-3 bg-blue-600 rounded hover:bg-blue-500"
              >
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <button onClick={() => navigate('/education')} className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-6">
          <ArrowLeft size={20} />
          Back to Learning Journey
        </button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">MEV Certifications</h1>
          <p className="text-gray-400">Earn verifiable credentials to showcase your MEV expertise</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {certifications.map(cert => {
            const userCert = getUserCert(cert.id);
            const hasPassed = userCert?.passed;

            return (
              <div
                key={cert.id}
                className={`bg-gray-800 rounded-lg p-6 border-2 ${
                  hasPassed ? 'border-green-500' : 'border-gray-700'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <Award className={hasPassed ? 'text-green-400' : 'text-gray-400'} size={32} />
                  {hasPassed && <CheckCircle className="text-green-400" size={24} />}
                </div>

                <h3 className="text-xl font-bold mb-2">{cert.name}</h3>
                <p className="text-sm text-gray-400 mb-4">{cert.description}</p>

                <div className="space-y-2 text-sm text-gray-400 mb-4">
                  <div className="flex items-center gap-2">
                    <Clock size={16} />
                    {cert.time_limit} minutes
                  </div>
                  <div className="flex items-center gap-2">
                    <Award size={16} />
                    {cert.xp_reward} XP
                  </div>
                  <div>
                    Passing Score: {cert.passing_score}%
                  </div>
                  <div>
                    Questions: {cert.total_questions}
                  </div>
                </div>

                {hasPassed ? (
                  <div className="space-y-2">
                    <div className="bg-green-900 text-green-300 p-3 rounded text-center font-semibold">
                      ✓ Certified
                    </div>
                    <button className="w-full px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 flex items-center justify-center gap-2">
                      <Download size={16} />
                      Download Certificate
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => startExam(cert)}
                    disabled={!user}
                    className="w-full px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {!user ? <Lock size={16} /> : null}
                    {userCert ? 'Retake Exam' : 'Start Exam'}
                  </button>
                )}

                {userCert && !hasPassed && (
                  <div className="mt-2 text-sm text-gray-400 text-center">
                    Attempts: {userCert.attempts} | Best: {userCert.exam_score}%
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Certifications;
