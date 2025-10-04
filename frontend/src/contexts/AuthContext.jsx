import React, { createContext, useContext, useReducer, useEffect } from 'react';
import apiService from '../services/api';
import { logError } from '../utils/errorHandler';

const AuthContext = createContext();

const initialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  tokens: { access: null, refresh: null },
  preferences: {
    theme: 'dark',
    preferred_cluster: 'mainnet-beta',
    notifications: {
      email: true,
      push: true,
      mevAlerts: true,
      validatorUpdates: false
    },
    alertThresholds: {
      minProfit: 0.01,
      maxRisk: 7,
      favoriteValidators: []
    }
  }
};

const authReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        tokens: action.payload.tokens,
        isAuthenticated: true,
        isLoading: false
      };
    case 'LOGOUT':
      return { ...initialState, isLoading: false };
    case 'UPDATE_USER':
      return { ...state, user: { ...state.user, ...action.payload } };
    case 'UPDATE_TOKENS':
      return { ...state, tokens: action.payload };
    case 'UPDATE_PREFERENCES':
      return { ...state, preferences: { ...state.preferences, ...action.payload } };
    case 'SET_PREFERENCES':
      return { ...state, preferences: action.payload };
    default:
      return state;
  }
};

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    let mounted = true;
    loadPreferences();
    if (mounted) {
      initializeAuth();
    }
    return () => { mounted = false; };
  }, []);

  const initializeAuth = async () => {
    try {
      const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (token && refreshToken) {
        try {
          const response = await apiService.verifyToken();
          if (response.success) {
            dispatch({
              type: 'LOGIN_SUCCESS',
              payload: {
                user: response.data.user,
                tokens: { access: token, refresh: refreshToken }
              }
            });
          } else {
            logout();
          }
        } catch (verifyError) {
          if (verifyError.statusCode === 429) {
            console.warn('Rate limited on token verification, skipping');
            dispatch({ type: 'SET_LOADING', payload: false });
            return;
          }
          logout();
        }
      }
    } catch (error) {
      logout();
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const login = async (credentials) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      console.log('🔐 Attempting login with:', credentials.email);
      
      const response = await apiService.login(credentials);
      console.log('📥 Login response:', response);
      
      if (response && response.success && response.data) {
        const { user, accessToken, refreshToken } = response.data;
        console.log('✅ Login successful for user:', user.email);
        
        // Store tokens immediately
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('token', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: {
            user,
            tokens: { access: accessToken, refresh: refreshToken }
          }
        });
        
        // Force page reload to ensure all components pick up the new token
        window.location.href = '/';
        
        return { success: true };
      }
      
      console.error('❌ Login failed:', response);
      return { success: false, error: response?.error || 'Login failed', retryAfter: response?.retryAfter };
    } catch (error) {
      console.error('❌ Login exception:', error);
      logError(error, { action: 'login' });
      return { success: false, error: error.message || 'Login failed', retryAfter: error.retryAfter };
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const register = async (userData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      const response = await apiService.register(userData);
      
      if (response.success) {
        return { success: true, message: 'Registration successful. Please check your email.' };
      }
      
      return { success: false, error: response.error };
    } catch (error) {
      logError(error, { action: 'register' });
      return { success: false, error: error.message };
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    dispatch({ type: 'LOGOUT' });
  };

  const updateUser = (userData) => {
    dispatch({ type: 'UPDATE_USER', payload: userData });
  };

  const setCluster = (cluster) => {
    updatePreferences({ preferred_cluster: cluster });
  };

  const updatePreferences = (newPreferences) => {
    const updatedPreferences = { ...state.preferences, ...newPreferences };
    localStorage.setItem('userPreferences', JSON.stringify(updatedPreferences));
    dispatch({ type: 'UPDATE_PREFERENCES', payload: newPreferences });
  };

  const loadPreferences = () => {
    try {
      const saved = localStorage.getItem('userPreferences');
      if (saved) {
        const preferences = JSON.parse(saved);
        dispatch({ type: 'SET_PREFERENCES', payload: preferences });
      }
    } catch (error) {
      console.warn('Failed to load user preferences:', error);
    }
  };

  const refreshTokens = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        logout();
        return false;
      }
      
      const response = await apiService.refreshToken();
      if (response.success) {
        const { accessToken, refreshToken: newRefreshToken } = response.data;
        
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('token', accessToken); // Keep for backwards compatibility
        localStorage.setItem('refreshToken', newRefreshToken);
        
        dispatch({
          type: 'UPDATE_TOKENS',
          payload: { access: accessToken, refresh: newRefreshToken }
        });
        
        return true;
      }
      return false;
    } catch (error) {
      logout();
      return false;
    }
  };

  const walletLogin = async (walletData) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      console.log('🔐 Attempting wallet login with:', walletData.publicKey);
      
      const response = await apiService.walletLogin({
        walletAddress: walletData.publicKey,
        signature: walletData.signature,
        message: walletData.message
      });
      
      if (response && response.success && response.data) {
        const { user, accessToken, refreshToken } = response.data;
        console.log('✅ Wallet login successful for:', user.email);
        
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('token', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: {
            user,
            tokens: { access: accessToken, refresh: refreshToken }
          }
        });
        
        window.location.href = '/';
        return { success: true };
      }
      
      return { success: false, error: response?.error || 'Wallet login failed' };
    } catch (error) {
      console.error('❌ Wallet login exception:', error);
      logError(error, { action: 'walletLogin' });
      return { success: false, error: error.message || 'Wallet login failed' };
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const value = {
    ...state,
    login,
    walletLogin,
    register,
    logout,
    updateUser,
    refreshTokens,
    updatePreferences,
    setCluster
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const useUser = () => {
  const { user, isAuthenticated } = useAuth();
  return { user, isAuthenticated };
};