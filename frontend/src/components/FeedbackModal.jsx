import React, { useState } from 'react';
import { X, Star, ThumbsUp, ThumbsDown } from 'lucide-react';

const FeedbackModal = ({ isOpen, onClose, moduleId, tutorialId, onSubmit }) => {
  const [rating, setRating] = useState(0);
  const [difficultyRating, setDifficultyRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [wouldRecommend, setWouldRecommend] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/education/analytics/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          moduleId,
          tutorialId,
          rating,
          difficultyRating,
          feedbackText,
          wouldRecommend
        })
      });

      const data = await response.json();
      if (data.success) {
        onSubmit?.();
        onClose();
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Share Your Feedback</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Overall Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Overall Rating
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="focus:outline-none"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Difficulty Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Difficulty Level (1=Easy, 5=Hard)
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setDifficultyRating(level)}
                  className={`w-10 h-10 rounded-lg border-2 font-semibold ${
                    level === difficultyRating
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 text-gray-600'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Would Recommend */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Would you recommend this to others?
            </label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setWouldRecommend(true)}
                className={`flex-1 py-2 px-4 rounded-lg border-2 flex items-center justify-center gap-2 ${
                  wouldRecommend === true
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-300 text-gray-600'
                }`}
              >
                <ThumbsUp className="w-5 h-5" />
                Yes
              </button>
              <button
                type="button"
                onClick={() => setWouldRecommend(false)}
                className={`flex-1 py-2 px-4 rounded-lg border-2 flex items-center justify-center gap-2 ${
                  wouldRecommend === false
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-300 text-gray-600'
                }`}
              >
                <ThumbsDown className="w-5 h-5" />
                No
              </button>
            </div>
          </div>

          {/* Feedback Text */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Comments (Optional)
            </label>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Share your thoughts..."
            />
          </div>

          {/* Submit Button */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || rating === 0}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FeedbackModal;
