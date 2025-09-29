import { create } from 'zustand'

type Theme = 'dark' | 'light' | 'system'

interface ThemeStore {
  theme: Theme
  setTheme: (theme: Theme) => void
  resolvedTheme: 'dark' | 'light'
  toggleTheme: () => void
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
  theme: 'system',
  resolvedTheme: getSystemTheme(),
  setTheme: (theme: Theme) => {
    set({ theme })
    // Update resolved theme based on system preference
    const resolvedTheme = theme === 'system' ? getSystemTheme() : theme
    set({ resolvedTheme })
    // Apply theme to document
    updateDocumentTheme(resolvedTheme)
    // Store in localStorage
    localStorage.setItem('mev-theme', theme)
  },
  toggleTheme: () => {
    const { theme } = get()
    const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
    get().setTheme(nextTheme)
  }
}))

function getSystemTheme(): 'dark' | 'light' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function updateDocumentTheme(theme: 'dark' | 'light') {
  if (typeof window === 'undefined') return
  const root = window.document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(theme)
}

// Initialize theme from localStorage and system preference
if (typeof window !== 'undefined') {
  const savedTheme = localStorage.getItem('mev-theme') as Theme | null
  const initialTheme = savedTheme || 'system'
  const resolvedTheme = initialTheme === 'system' ? getSystemTheme() : initialTheme
  
  useThemeStore.setState({ 
    theme: initialTheme, 
    resolvedTheme 
  })
  updateDocumentTheme(resolvedTheme)
  
  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const store = useThemeStore.getState()
    if (store.theme === 'system') {
      const systemTheme = e.matches ? 'dark' : 'light'
      useThemeStore.setState({ resolvedTheme: systemTheme })
      updateDocumentTheme(systemTheme)
    }
  })
}