import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Award, MessageSquare } from 'lucide-react';
import api from '../../services/api';
import { useAnnouncement } from '../../hooks/useAnnouncement';
import FeedbackModal from '../../components/FeedbackModal';

const ModuleView = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [module, setModule] = useState(null);
  const [currentSection, setCurrentSection] = useState(0);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const [timeTrackingId, setTimeTrackingId] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  
  useAnnouncement(announcement);

  useEffect(() => {
    loadModule();
    startTimeTracking();
    return () => endTimeTracking();
  }, [slug]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      if (e.key === 'ArrowLeft' && currentSection > 0) {
        handlePrevious();
      } else if (e.key === 'ArrowRight' && currentSection < module?.sections.length - 1) {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [currentSection, module]);

  // Auto-save progress every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (hasChanges && !saving) {
        saveProgress();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [hasChanges, saving]);

  // Save progress on section change
  useEffect(() => {
    if (module && currentSection > 0) {
      setHasChanges(true);
      saveProgress();
    }
  }, [currentSection]);

  // Load saved progress from localStorage
  useEffect(() => {
    if (module) {
      const savedProgress = localStorage.getItem(`module_progress_${slug}`);
      if (savedProgress) {
        const { section, quiz } = JSON.parse(savedProgress);
        if (section !== undefined && section < module.sections.length) {
          setCurrentSection(section);
        }
        if (quiz) {
          setShowQuiz(quiz);
        }
      }
    }
  }, [module]);

  const loadModule = async () => {
    try {
      const response = await api.get(`/education/modules/${slug}`);
      setModule(response.data);
    } catch (error) {
      console.error('Failed to load module:', error);
    } finally {
      setLoading(false);
    }
  };

  const startTimeTracking = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      
      const response = await api.post('/education/analytics/time/start', {
        moduleId: module?.id,
        sectionId: null,
        tutorialId: null
      });
      if (response.sessionId) {
        setTimeTrackingId(response.sessionId);
      }
    } catch (error) {
      console.error('Failed to start time tracking:', error);
    }
  };

  const endTimeTracking = async () => {
    if (!timeTrackingId) return;
    try {
      await api.post(`/education/analytics/time/end/${timeTrackingId}`);
    } catch (error) {
      console.error('Failed to end time tracking:', error);
    }
  };

  const saveProgress = async () => {
    if (!module) return;
    
    setSaving(true);
    try {
      // Save to localStorage as backup
      localStorage.setItem(`module_progress_${slug}`, JSON.stringify({
        section: currentSection,
        quiz: showQuiz,
        timestamp: Date.now()
      }));

      // Save to backend if authenticated
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      if (token) {
        try {
          await api.post(`/education/progress/${module.id}`, {
            progress_percentage: Math.round(((currentSection + 1) / module.sections.length) * 100),
            last_section: currentSection,
            status: showQuiz ? 'quiz' : 'in_progress',
            time_spent: 0
          });
        } catch (apiError) {
          // Silently fail if not authenticated
          if (apiError.statusCode !== 401) {
            console.error('Failed to save progress:', apiError);
          }
        }
      }
      
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save progress:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleNext = () => {
    if (currentSection < module.sections.length - 1) {
      setCurrentSection(currentSection + 1);
      setHasChanges(true);
      setAnnouncement(`Moved to section ${currentSection + 2} of ${module.sections.length}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setShowQuiz(true);
      setHasChanges(true);
      setAnnouncement('Starting quiz');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevious = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
      setAnnouncement(`Moved to section ${currentSection} of ${module.sections.length}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleQuizAnswer = (questionId, answerIndex) => {
    setQuizAnswers({ ...quizAnswers, [questionId]: answerIndex });
  };

  const handleQuizSubmit = async () => {
    const questions = module.quiz.questions;
    let correct = 0;
    questions.forEach(q => {
      if (quizAnswers[q.id] === q.correct) correct++;
    });
    const finalScore = Math.round((correct / questions.length) * 100);
    setScore(finalScore);
    setQuizSubmitted(true);

    if (finalScore >= module.quiz.passing_score) {
      try {
        await api.post(`/education/complete/${module.id}`, { quiz_score: finalScore });
        
        // Record daily activity
        await api.post('/education/activity/daily', {
          xpEarned: module.xp_reward,
          modulesCompleted: 1,
          tutorialsCompleted: 0
        });
        
        // Check for new badges
        const badgeResponse = await api.post('/education/badges/check');
        if (badgeResponse.data && badgeResponse.data.length > 0) {
          setAnnouncement(`New badge${badgeResponse.data.length > 1 ? 's' : ''} unlocked!`);
        }
      } catch (error) {
        console.error('Failed to save completion:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading module...</p>
        </div>
      </div>
    );
  }
  
  if (!module) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-xl">Module not found</p>
          <button onClick={() => navigate('/education')} className="mt-4 px-4 py-2 bg-blue-600 rounded hover:bg-blue-500">
            Back to Learning Journey
          </button>
        </div>
      </div>
    );
  }

  const section = module.sections[currentSection];
  const progress = ((currentSection + 1) / module.sections.length) * 100;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto p-6">
        <button 
          onClick={() => navigate('/education')} 
          className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-6"
          aria-label="Back to Learning Journey"
        >
          <ArrowLeft size={20} aria-hidden="true" />
          Back to Learning Journey
        </button>

        <div className="bg-gray-800 rounded-lg p-6 mb-6" role="banner">
          <h1 className="text-3xl font-bold mb-2" id="module-title">{module.title}</h1>
          <p className="text-gray-400 mb-4">{module.description}</p>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span>⏱️ {module.estimated_time} min</span>
            <span>📊 {module.difficulty}</span>
            <span>⭐ {module.xp_reward} XP</span>
          </div>
        </div>

        {!showQuiz ? (
          <>
            <div className="bg-gray-800 rounded-lg p-6 mb-6" role="main" aria-labelledby="section-title">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold" id="section-title">{section.title}</h2>
                <span className="text-sm text-gray-400" aria-label={`Section ${currentSection + 1} of ${module.sections.length}`}>Section {currentSection + 1} of {module.sections.length}</span>
              </div>
              
              <div className="prose prose-invert max-w-none">
                <p className="text-gray-300 mb-4">{section.content.text}</p>
                
                {section.content.keyPoints && (
                  <div className="bg-gray-700 rounded p-4 mb-4">
                    <h3 className="text-lg font-semibold mb-2">Key Points:</h3>
                    <ul className="space-y-2">
                      {section.content.keyPoints.map((point, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle size={16} className="text-green-400 mt-1 flex-shrink-0" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {section.content.examples && (
                  <div className="space-y-3 mb-4">
                    <h3 className="text-lg font-semibold">Examples:</h3>
                    {section.content.examples.map((ex, i) => (
                      <div key={i} className="bg-gray-700 rounded p-4">
                        <h4 className="font-semibold text-blue-400 mb-1">{ex.type}</h4>
                        <p className="text-gray-300">{ex.description}</p>
                      </div>
                    ))}
                  </div>
                )}

                {section.content.comparison && (
                  <div className="overflow-x-auto mb-4">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-700">
                        <tr>
                          <th className="p-2 text-left">Aspect</th>
                          <th className="p-2 text-left">Ethereum</th>
                          <th className="p-2 text-left">Solana</th>
                          <th className="p-2 text-left">Impact</th>
                        </tr>
                      </thead>
                      <tbody>
                        {section.content.comparison.map((row, i) => (
                          <tr key={i} className="border-t border-gray-700">
                            <td className="p-2 font-semibold">{row.aspect}</td>
                            <td className="p-2">{row.ethereum}</td>
                            <td className="p-2">{row.solana}</td>
                            <td className="p-2 text-gray-400">{row.impact}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {section.content.stakeholders && (
                  <div className="space-y-3 mb-4">
                    <h3 className="text-lg font-semibold">Stakeholders:</h3>
                    {section.content.stakeholders.map((sh, i) => (
                      <div key={i} className="bg-gray-700 rounded p-4">
                        <h4 className="font-semibold text-blue-400 mb-1">{sh.role}</h4>
                        <p className="text-gray-300 mb-2"><strong>Impact:</strong> {sh.impact}</p>
                        <p className="text-gray-400"><strong>Action:</strong> {sh.action}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-4 mb-6" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin="0" aria-valuemax="100" aria-label="Module progress">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-400">Progress</span>
                <span className="text-sm text-gray-400">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <nav className="flex justify-between items-center" aria-label="Section navigation">
              <button 
                onClick={handlePrevious} 
                disabled={currentSection === 0} 
                className="px-6 py-2 bg-gray-700 rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Go to previous section"
              >
                Previous
              </button>
              <div className="flex items-center gap-3">
                {saving && <span className="text-sm text-gray-400" role="status" aria-live="polite">Saving...</span>}
                <button 
                  onClick={handleNext} 
                  className="px-6 py-2 bg-blue-600 rounded hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  aria-label={currentSection === module.sections.length - 1 ? 'Take quiz' : 'Go to next section'}
                >
                  {currentSection === module.sections.length - 1 ? 'Take Quiz' : 'Next'}
                </button>
              </div>
            </nav>
          </>
        ) : (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">{module.quiz.title}</h2>
            
            {!quizSubmitted ? (
              <>
                <p className="text-gray-400 mb-6">Passing score: {module.quiz.passing_score}%</p>
                <div className="space-y-6">
                  {module.quiz.questions.map((q, i) => (
                    <div key={q.id} className="bg-gray-700 rounded p-4">
                      <p className="font-semibold mb-3">{i + 1}. {q.question}</p>
                      <div className="space-y-2">
                        {q.options.map((option, optIdx) => (
                          <label key={optIdx} className="flex items-center gap-3 p-3 bg-gray-800 rounded cursor-pointer hover:bg-gray-750">
                            <input type="radio" name={`q${q.id}`} checked={quizAnswers[q.id] === optIdx} onChange={() => handleQuizAnswer(q.id, optIdx)} className="w-4 h-4" />
                            <span>{option}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={handleQuizSubmit} disabled={Object.keys(quizAnswers).length < module.quiz.questions.length} className="mt-6 w-full px-6 py-3 bg-blue-600 rounded hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed">
                  Submit Quiz
                </button>
              </>
            ) : (
              <div className="text-center">
                <div className={`text-6xl mb-4 ${score >= module.quiz.passing_score ? 'text-green-400' : 'text-red-400'}`}>
                  {score >= module.quiz.passing_score ? '🎉' : '😔'}
                </div>
                <h3 className="text-2xl font-bold mb-2">Score: {score}%</h3>
                <p className="text-gray-400 mb-6">
                  {score >= module.quiz.passing_score 
                    ? `Congratulations! You earned ${module.xp_reward} XP and the "${module.badge_id}" badge!`
                    : `You need ${module.quiz.passing_score}% to pass. Review the material and try again.`}
                </p>
                
                <div className="space-y-4 mb-6 text-left">
                  {module.quiz.questions.map((q, i) => (
                    <div key={q.id} className={`bg-gray-700 rounded p-4 ${quizAnswers[q.id] === q.correct ? 'border-l-4 border-green-400' : 'border-l-4 border-red-400'}`}>
                      <p className="font-semibold mb-2">{i + 1}. {q.question}</p>
                      <p className="text-sm text-gray-400 mb-1">Your answer: {q.options[quizAnswers[q.id]]}</p>
                      {quizAnswers[q.id] !== q.correct && (
                        <p className="text-sm text-green-400 mb-1">Correct answer: {q.options[q.correct]}</p>
                      )}
                      <p className="text-sm text-gray-300 mt-2">{q.explanation}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 justify-center">
                  <button 
                    onClick={() => setShowFeedback(true)} 
                    className="px-6 py-3 bg-gray-700 rounded hover:bg-gray-600 flex items-center gap-2"
                  >
                    <MessageSquare className="w-5 h-5" />
                    Give Feedback
                  </button>
                  <button onClick={() => navigate('/education')} className="px-6 py-3 bg-blue-600 rounded hover:bg-blue-500">
                    Back to Learning Journey
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <FeedbackModal
        isOpen={showFeedback}
        onClose={() => setShowFeedback(false)}
        moduleId={module?.id}
        tutorialId={null}
        onSubmit={() => {
          setAnnouncement('Thank you for your feedback!');
        }}
      />
    </div>
  );
};

export default ModuleView;
