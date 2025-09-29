import { create } from 'zustand'

export interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  persistent?: boolean
  action?: {
    label: string
    onClick: () => void
  }
}

export interface Modal {
  id: string
  component: React.ComponentType<any>
  props?: any
  size?: 'sm' | 'md' | 'lg' | 'xl'
  persistent?: boolean
}

interface UIStore {
  // Notifications
  notifications: Notification[]
  
  // Modals
  modals: Modal[]
  
  // Loading states
  globalLoading: boolean
  loadingStates: Record<string, boolean>
  
  // Connection status
  isOnline: boolean
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting' | 'error'
  
  // Sidebar state
  sidebarOpen: boolean
  
  // Actions
  addNotification: (notification: Omit<Notification, 'id'>) => string
  removeNotification: (id: string) => void
  clearNotifications: () => void
  
  openModal: (modal: Omit<Modal, 'id'>) => string
  closeModal: (id: string) => void
  closeAllModals: () => void
  
  setGlobalLoading: (loading: boolean) => void
  setLoadingState: (key: string, loading: boolean) => void
  
  setConnectionStatus: (status: UIStore['connectionStatus']) => void
  setOnlineStatus: (online: boolean) => void
  
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
}

export const useUIStore = create<UIStore>((set, get) => ({
  // Initial state
  notifications: [],
  modals: [],
  globalLoading: false,
  loadingStates: {},
  isOnline: navigator.onLine,
  connectionStatus: 'connected',
  sidebarOpen: false,
  
  // Notification actions
  addNotification: (notification) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const fullNotification: Notification = {
      id,
      duration: 5000,
      ...notification
    }
    
    set((state) => ({
      notifications: [...state.notifications, fullNotification]
    }))
    
    // Auto-remove notification after duration (unless persistent)
    if (!fullNotification.persistent && fullNotification.duration) {
      setTimeout(() => {
        get().removeNotification(id)
      }, fullNotification.duration)
    }
    
    return id
  },
  
  removeNotification: (id) => {
    set((state) => ({
      notifications: state.notifications.filter(n => n.id !== id)
    }))
  },
  
  clearNotifications: () => {
    set({ notifications: [] })
  },
  
  // Modal actions
  openModal: (modal) => {
    const id = `modal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const fullModal: Modal = {
      id,
      size: 'md',
      ...modal
    }
    
    set((state) => ({
      modals: [...state.modals, fullModal]
    }))
    
    return id
  },
  
  closeModal: (id) => {
    set((state) => ({
      modals: state.modals.filter(m => m.id !== id)
    }))
  },
  
  closeAllModals: () => {
    set({ modals: [] })
  },
  
  // Loading actions
  setGlobalLoading: (globalLoading) => {
    set({ globalLoading })
  },
  
  setLoadingState: (key, loading) => {
    set((state) => ({
      loadingStates: {
        ...state.loadingStates,
        [key]: loading
      }
    }))
  },
  
  // Connection actions
  setConnectionStatus: (connectionStatus) => {
    set({ connectionStatus })
  },
  
  setOnlineStatus: (isOnline) => {
    set({ isOnline })
  },
  
  // Sidebar actions
  setSidebarOpen: (sidebarOpen) => {
    set({ sidebarOpen })
  },
  
  toggleSidebar: () => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }))
  }
}))

// Listen for online/offline events
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    useUIStore.getState().setOnlineStatus(true)
    useUIStore.getState().setConnectionStatus('connected')
  })
  
  window.addEventListener('offline', () => {
    useUIStore.getState().setOnlineStatus(false)
    useUIStore.getState().setConnectionStatus('disconnected')
  })
}

// Helper functions for common notification types
export const notify = {
  success: (title: string, message?: string, options?: Partial<Notification>) => {
    return useUIStore.getState().addNotification({
      type: 'success',
      title,
      message,
      ...options
    })
  },
  
  error: (title: string, message?: string, options?: Partial<Notification>) => {
    return useUIStore.getState().addNotification({
      type: 'error',
      title,
      message,
      duration: 8000, // Longer for errors
      ...options
    })
  },
  
  warning: (title: string, message?: string, options?: Partial<Notification>) => {
    return useUIStore.getState().addNotification({
      type: 'warning',
      title,
      message,
      ...options
    })
  },
  
  info: (title: string, message?: string, options?: Partial<Notification>) => {
    return useUIStore.getState().addNotification({
      type: 'info',
      title,
      message,
      ...options
    })
  }
}