import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute'
import { BaseLayout } from './components/layouts/BaseLayout'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { SignupPage } from './pages/SignupPage'
import { SubscriptionPage } from './pages/SubscriptionPage'
import { ProfilePage } from './pages/ProfilePage'
import { ValidatorPage } from './pages/ValidatorPage'
import { DelegationPage } from './pages/DelegationPage'
import { SearcherOpportunitiesPage } from './pages/SearcherOpportunitiesPage'
import { SearcherSimulationsPage } from './pages/SearcherSimulationsPage'
import { BotGeneratorPage } from './pages/BotGeneratorPage'
import { ResearcherHistoricalPage } from './pages/ResearcherHistoricalPage'
import { WebSocketProvider } from './hooks/useWebSocket'

function App() {
  return (
    <WebSocketProvider url="ws://localhost:8000/ws">
      <Router>
      <Routes>
        {/* Public routes */}
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          } 
        />
        
        <Route 
          path="/signup" 
          element={
            <PublicRoute>
              <SignupPage />
            </PublicRoute>
          } 
        />
        
        {/* Protected routes with layout */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <BaseLayout />
            </ProtectedRoute>
          }
        >
          {/* Dashboard - accessible to all authenticated users */}
          <Route path="dashboard" element={<DashboardPage />} />
          
          {/* Profile and subscription routes */}
          <Route path="profile" element={<ProfilePage />} />
          <Route path="subscription" element={<SubscriptionPage />} />
          
          {/* Validator routes */}
          <Route path="validator" element={<ValidatorPage />} />
          <Route path="delegation" element={<DelegationPage />} />
          <Route 
            path="validator/performance" 
            element={
              <ProtectedRoute allowedRoles={['validator', 'admin']}>
                <ValidatorPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="validator/delegation" 
            element={
              <ProtectedRoute allowedRoles={['validator', 'admin']}>
                <div>Delegation Analytics Page - Coming Soon</div>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="validator/rewards" 
            element={
              <ProtectedRoute allowedRoles={['validator', 'admin']}>
                <div>MEV Rewards Page - Coming Soon</div>
              </ProtectedRoute>
            } 
          />
          
          {/* Searcher routes */}
          <Route 
            path="searcher/opportunities" 
            element={
              <ProtectedRoute allowedRoles={['searcher', 'admin']}>
                <SearcherOpportunitiesPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="searcher/simulations" 
            element={
              <ProtectedRoute allowedRoles={['searcher', 'admin']}>
                <SearcherSimulationsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="searcher/bot-generator" 
            element={
              <ProtectedRoute allowedRoles={['searcher', 'admin']}>
                <BotGeneratorPage />
              </ProtectedRoute>
            } 
          />
          
          {/* Researcher routes */}
          <Route 
            path="researcher/historical" 
            element={
              <ProtectedRoute allowedRoles={['researcher', 'admin']}>
                <ResearcherHistoricalPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="researcher/analysis" 
            element={
              <ProtectedRoute allowedRoles={['researcher', 'admin']}>
                <div>Market Analysis Page - Coming Soon</div>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="researcher/tools" 
            element={
              <ProtectedRoute allowedRoles={['researcher', 'admin']}>
                <div>Research Tools Page - Coming Soon</div>
              </ProtectedRoute>
            } 
          />
          
          {/* Shared routes */}
          <Route 
            path="education" 
            element={
              <div>Education Page - Coming Soon</div>
            } 
          />
        </Route>
        
        {/* Redirect root to dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        
        {/* Unauthorized page */}
        <Route 
          path="/unauthorized" 
          element={
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-2xl font-bold mb-4">Unauthorized</h1>
                <p>You don't have permission to access this page.</p>
              </div>
            </div>
          } 
        />
        
        {/* 404 page */}
        <Route 
          path="*" 
          element={
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-2xl font-bold mb-4">Page Not Found</h1>
                <p>The page you're looking for doesn't exist.</p>
              </div>
            </div>
          } 
        />
      </Routes>
      </Router>
    </WebSocketProvider>
  )
}

export default App
