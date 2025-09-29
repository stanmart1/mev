import { useEffect } from 'react'
import { useThemeStore } from '@/stores/themeStore'

interface ThemeProviderProps {
  children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const { theme, resolvedTheme, setTheme } = useThemeStore()

  useEffect(() => {
    // Initialize theme on mount
    const savedTheme = localStorage.getItem('mev-theme') as 'dark' | 'light' | 'system' | null
    if (savedTheme) {
      setTheme(savedTheme)
    } else {
      // Set system theme as default
      setTheme('system')
    }
  }, [setTheme])

  useEffect(() => {
    // Apply theme to document root
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(resolvedTheme)
  }, [resolvedTheme])

  return <>{children}</>
}