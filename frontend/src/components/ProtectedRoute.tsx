import { Navigate } from 'react-router-dom'
import { useAuthStore, type UserRole } from '@/stores/authStore'
import { useEffect } from 'react'

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: UserRole[]
  requireAuth?: boolean
}

export function ProtectedRoute({ 
  children, 
  allowedRoles = [], 
  requireAuth = true 
}: ProtectedRouteProps) {
  const { isAuthenticated, user, token, setLoading } = useAuthStore()

  // Auto-refresh token logic
  useEffect(() => {
    const refreshToken = async () => {
      if (token && isAuthenticated) {
        try {
          setLoading(true)
          const response = await fetch('http://localhost:8000/api/auth/refresh', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })

          if (response.ok) {
            const data = await response.json()
            useAuthStore.getState().setToken(data.accessToken)
            useAuthStore.getState().setUser(data.user)
          }
        } catch (error) {
          console.error('Token refresh failed:', error)
          // Don't log out automatically on refresh failure
        } finally {
          setLoading(false)
        }
      }
    }

    // Refresh token every 30 minutes
    const interval = setInterval(refreshToken, 30 * 60 * 1000)
    
    // Also refresh on mount if token exists
    if (token) {
      refreshToken()
    }

    return () => clearInterval(interval)
  }, [token, isAuthenticated, setLoading])

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />
  }

  return <>{children}</>
}

export function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}