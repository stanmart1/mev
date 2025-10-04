import { useState } from 'react';
import { BookOpen, Play, ExternalLink, ChevronRight, BookMarked } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Card from '../../components/common/Card';

const educationContent = [
  {
    id: 1,
    title: 'What is MEV?',
    description: 'Learn the fundamentals of Maximum Extractable Value and how it works on Solana.',
    type: 'article',
    duration: '5 min read',
    difficulty: 'Beginner'
  },
  {
    id: 2,
    title: 'Arbitrage Opportunities',
    description: 'Understanding price differences across DEXs and how to profit from them.',
    type: 'video',
    duration: '12 min',
    difficulty: 'Intermediate'
  },
  {
    id: 3,
    title: 'Liquidation Mechanics',
    description: 'How liquidations work in DeFi protocols and MEV extraction strategies.',
    type: 'article',
    duration: '8 min read',
    difficulty: 'Advanced'
  },
  {
    id: 4,
    title: 'Bundle Construction',
    description: 'Learn how to build and optimize transaction bundles for maximum profit.',
    type: 'tutorial',
    duration: '20 min',
    difficulty: 'Advanced'
  }
];

export default function EducationPage() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState('all');

  const categories = ['all', 'article', 'video', 'tutorial'];
  const difficulties = ['all', 'Beginner', 'Intermediate', 'Advanced'];

  const filteredContent = educationContent.filter(item => {
    if (selectedCategory !== 'all' && item.type !== selectedCategory) return false;
    if (selectedDifficulty !== 'all' && item.difficulty !== selectedDifficulty) return false;
    return true;
  });

  const getTypeIcon = (type) => {
    switch (type) {
      case 'video': return <Play className="w-4 h-4" />;
      case 'tutorial': return <BookOpen className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-100 text-green-800';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'Advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">MEV Education Center</h1>
        <p className="text-gray-600 dark:text-gray-400">Learn about MEV strategies, risks, and best practices</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Content Type
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category === 'all' ? 'All Types' : category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Difficulty
          </label>
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
          >
            {difficulties.map(difficulty => (
              <option key={difficulty} value={difficulty}>
                {difficulty === 'all' ? 'All Levels' : difficulty}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredContent.map((item) => (
          <Card key={item.id} className="hover:shadow-lg transition-shadow cursor-pointer">
            <div className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2 text-blue-600">
                  {getTypeIcon(item.type)}
                  <span className="text-sm font-medium capitalize">{item.type}</span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(item.difficulty)}`}>
                  {item.difficulty}
                </span>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {item.title}
              </h3>
              
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                {item.description}
              </p>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {item.duration}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Links */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Links</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => navigate('/glossary')}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
          >
            <BookMarked className="w-4 h-4" />
            <span>MEV Glossary</span>
          </button>
          <button
            onClick={() => navigate('/api-explorer')}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
          >
            <ExternalLink className="w-4 h-4" />
            <span>API Documentation</span>
          </button>
          <a
            href="#"
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Solana Documentation</span>
          </a>
          <a
            href="#"
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Community Discord</span>
          </a>
        </div>
      </div>
    </div>
  );
}