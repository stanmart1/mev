import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SolanaWalletProvider } from './contexts/WalletContext';
import { DemoProvider } from './contexts/DemoContext';
import Layout from './components/Layout';
import Dashboard from './pages/dashboard/Dashboard';
import LiveOpportunities from './pages/dashboard/LiveOpportunities';
import OpportunitiesPage from './pages/opportunities/OpportunitiesPage';
import ValidatorsPage from './pages/validators/ValidatorsPage';
import { HistoricalAnalytics } from './pages/analytics';
import { SearcherPerformance } from './pages/searcher-analytics';
import MarketIntelligence from './pages/market-intelligence/MarketIntelligence';
import SimulationsPage from './pages/simulations/SimulationsPage';
import { LearningJourney, ModuleView, TutorialView, PracticeMode, Certifications, SkillAssessment, AnalyticsDashboard, AdminAnalytics } from './pages/education';
import BadgesPage from './pages/education/BadgesPage';
import LeaderboardPage from './pages/education/LeaderboardPage';
import Glossary from './pages/documentation/Glossary';
import APIExplorer from './pages/documentation/APIExplorer';
import ErrorBoundary from './components/ErrorBoundary';
import SkipToContent from './components/SkipToContent';
import ProfilePage from './pages/profile/ProfilePage';
import SettingsPage from './pages/settings/SettingsPage';
import DemoPage from './pages/demo/DemoPage';
import Signup from './pages/auth/Signup';
import ActivityPage from './pages/activity/ActivityPage';
import BundleBuilder from './pages/bundle-builder/BundleBuilder';
import ProfitCalculator from './pages/profit-calculator/ProfitCalculator';
import Login from './pages/auth/Login';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  return isAuthenticated ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  return (
    <>
      <SkipToContent />
      <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="live" element={<LiveOpportunities />} />
        <Route path="opportunities" element={<OpportunitiesPage />} />
        <Route path="validators" element={<ValidatorsPage />} />
        <Route path="analytics" element={<HistoricalAnalytics />} />
        <Route path="searcher-performance" element={<SearcherPerformance />} />
        <Route path="market-intelligence" element={<MarketIntelligence />} />
        <Route path="simulations" element={<SimulationsPage />} />
        <Route path="bundle-builder" element={<BundleBuilder />} />
        <Route path="profit-calculator" element={<ProfitCalculator />} />
        <Route path="activity" element={<ActivityPage />} />
        <Route path="education" element={<ErrorBoundary><LearningJourney /></ErrorBoundary>} />
        <Route path="education/module/:slug" element={<ErrorBoundary><ModuleView /></ErrorBoundary>} />
        <Route path="education/tutorial/:slug" element={<ErrorBoundary><TutorialView /></ErrorBoundary>} />
        <Route path="education/practice" element={<ErrorBoundary><PracticeMode /></ErrorBoundary>} />
        <Route path="education/certifications" element={<ErrorBoundary><Certifications /></ErrorBoundary>} />
        <Route path="education/assessment" element={<ErrorBoundary><SkillAssessment /></ErrorBoundary>} />
        <Route path="education/analytics" element={<ErrorBoundary><AnalyticsDashboard /></ErrorBoundary>} />
        <Route path="education/admin-analytics" element={<ErrorBoundary><AdminAnalytics /></ErrorBoundary>} />
        <Route path="education/badges" element={<ErrorBoundary><BadgesPage /></ErrorBoundary>} />
        <Route path="education/leaderboard" element={<ErrorBoundary><LeaderboardPage /></ErrorBoundary>} />
        <Route path="glossary" element={<ErrorBoundary><Glossary /></ErrorBoundary>} />
        <Route path="api-explorer" element={<ErrorBoundary><APIExplorer /></ErrorBoundary>} />
        <Route path="demo" element={<DemoPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DemoProvider>
        <ThemeProvider>
          <SolanaWalletProvider>
            <AuthProvider>
              <Router>
                <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
                  <AppRoutes />
                </div>
              </Router>
            </AuthProvider>
          </SolanaWalletProvider>
        </ThemeProvider>
      </DemoProvider>
    </QueryClientProvider>
  );
}

export default App;