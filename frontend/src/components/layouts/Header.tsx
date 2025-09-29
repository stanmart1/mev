import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { Moon, Sun, User, LogOut, Settings } from 'lucide-react'

export function Header() {
  const { user, logout } = useAuthStore()
  const { theme, toggleTheme, resolvedTheme } = useThemeStore()

  const handleLogout = () => {
    logout()
  }

  return (
    <header className="border-b bg-background px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-foreground">
            MEV Analytics
          </h1>
          {user && (
            <div className="hidden md:block">
              <span className="text-sm text-muted-foreground">
                Welcome back, {user.email}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>

          {user && (
            <>
              {/* User Settings */}
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
              >
                <Settings className="h-4 w-4" />
                <span className="sr-only">Settings</span>
              </Button>

              {/* User Profile */}
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                >
                  <User className="h-4 w-4" />
                  <span className="sr-only">Profile</span>
                </Button>
                
                <div className="hidden md:block text-sm">
                  <div className="font-medium">{user.role}</div>
                  <div className="text-muted-foreground text-xs">
                    {user.walletAddress ? 
                      `${user.walletAddress.slice(0, 4)}...${user.walletAddress.slice(-4)}` : 
                      'No wallet connected'
                    }
                  </div>
                </div>
              </div>

              {/* Logout */}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="h-9 w-9"
              >
                <LogOut className="h-4 w-4" />
                <span className="sr-only">Logout</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}