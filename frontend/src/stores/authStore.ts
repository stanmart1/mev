import { create } from 'zustand'
import { authAPI } from '../services/authApi'
import type { User, LoginCredentials, SignupData, WalletLoginData } from '../services/authApi'

export type UserRole = 'validator' | 'searcher' | 'researcher' | 'admin'

interface AuthStore {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (data: SignupData) => Promise<void>
  loginWithWallet: (walletAddress: string, signature: string, message: string) => Promise<void>
  logout: () => void
  setUser: (user: User | null) => void
  setToken: (token: string | null) => void
  setLoading: (loading: boolean) => void
  refreshToken: () => Promise<void>
  verifyToken: () => Promise<void>
}

const API_BASE_URL = 'http://localhost:8000/api'

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: localStorage.getItem('mev-token'),
  isAuthenticated: false,
  isLoading: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true })
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      })

      if (!response.ok) {
        throw new Error('Login failed')
      }

      const data = await response.json()
      const { user, accessToken } = data

      localStorage.setItem('mev-token', accessToken)
      set({
        user,
        token: accessToken,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  signup: async (signupData: SignupData) => {
    set({ isLoading: true })
    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(signupData),
      })

      if (!response.ok) {
        throw new Error('Signup failed')
      }

      const data = await response.json()
      const { user, accessToken } = data

      localStorage.setItem('mev-token', accessToken)
      set({
        user,
        token: accessToken,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  loginWithWallet: async (walletAddress: string, signature: string, message: string) => {
    set({ isLoading: true })
    try {
      const response = await fetch(`${API_BASE_URL}/auth/wallet-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress, signature, message }),
      })

      if (!response.ok) {
        throw new Error('Wallet login failed')
      }

      const data = await response.json()
      const { user, accessToken } = data

      localStorage.setItem('mev-token', accessToken)
      set({
        user,
        token: accessToken,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  logout: () => {
    localStorage.removeItem('mev-token')
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    })
  },

  setUser: (user: User | null) => {
    set({ user, isAuthenticated: !!user })
  },

  setToken: (token: string | null) => {
    if (token) {
      localStorage.setItem('mev-token', token)
    } else {
      localStorage.removeItem('mev-token')
    }
    set({ token })
  },

  setLoading: (isLoading: boolean) => {
    set({ isLoading })
  },

  refreshToken: async () => {
    try {
      const authResponse = await authAPI.refreshToken()
      set({
        user: authResponse.user,
        token: authResponse.accessToken,
        isAuthenticated: true,
      })
    } catch (error) {
      // If refresh fails, logout user
      get().logout()
      throw error
    }
  },

  verifyToken: async () => {
    const token = get().token
    if (!token) {
      return
    }

    try {
      const user = await authAPI.verifyToken()
      set({
        user,
        isAuthenticated: true,
      })
    } catch (error) {
      // Token is invalid, clear it
      get().logout()
      throw error
    }
  },
}))

// Initialize auth state from localStorage
if (typeof window !== 'undefined') {
  const token = localStorage.getItem('mev-token')
  if (token) {
    useAuthStore.setState({ token })
    // Verify token with backend and get user info
    fetch(`${API_BASE_URL}/auth/verify`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => {
        if (response.ok) {
          return response.json()
        }
        throw new Error('Token invalid')
      })
      .then((data) => {
        useAuthStore.setState({
          user: data.user,
          isAuthenticated: true,
        })
      })
      .catch(() => {
        // Token is invalid, remove it
        localStorage.removeItem('mev-token')
        useAuthStore.setState({
          token: null,
          user: null,
          isAuthenticated: false,
        })
      })
  }
}