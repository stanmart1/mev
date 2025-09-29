import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuthStore, type UserRole } from '@/stores/authStore'
import { cn } from '@/lib/utils'
import { 
  BarChart3, 
  Coins, 
  TrendingUp, 
  Users, 
  Shield, 
  BookOpen, 
  Settings,
  Home,
  Search,
  Target,
  PieChart,
  Menu,
  X,
  CreditCard,
  User
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: UserRole[]
}

const navigationItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: Home,
    roles: ['validator', 'searcher', 'researcher', 'admin']
  },
  // Validator-specific routes
  {
    label: 'Validator Dashboard',
    href: '/validator',
    icon: Shield,
    roles: ['validator', 'admin']
  },
  {
    label: 'Delegation Tools',
    href: '/delegation',
    icon: Target,
    roles: ['validator', 'admin']
  },
  {
    label: 'Validator Performance',
    href: '/validator/performance',
    icon: Shield,
    roles: ['validator', 'admin']
  },
  {
    label: 'Delegation Analytics',
    href: '/validator/delegation',
    icon: Users,
    roles: ['validator', 'admin']
  },
  {
    label: 'MEV Rewards',
    href: '/validator/rewards',
    icon: Coins,
    roles: ['validator', 'admin']
  },
  // Searcher-specific routes
  {
    label: 'Live Opportunities',
    href: '/searcher/opportunities',
    icon: Target,
    roles: ['searcher', 'admin']
  },
  {
    label: 'Profit Simulations',
    href: '/searcher/simulations',
    icon: TrendingUp,
    roles: ['searcher', 'admin']
  },
  {
    label: 'Bot Generator',
    href: '/searcher/bot-generator',
    icon: Settings,
    roles: ['searcher', 'admin']
  },
  // Researcher-specific routes
  {
    label: 'Historical Data',
    href: '/researcher/historical',
    icon: BarChart3,
    roles: ['researcher', 'admin']
  },
  {
    label: 'Market Analysis',
    href: '/researcher/analysis',
    icon: PieChart,
    roles: ['researcher', 'admin']
  },
  {
    label: 'Research Tools',
    href: '/researcher/tools',
    icon: Search,
    roles: ['researcher', 'admin']
  },
  // Shared routes
  {
    label: 'Profile Settings',
    href: '/profile',
    icon: User,
    roles: ['validator', 'searcher', 'researcher', 'admin']
  },
  {
    label: 'Subscription',
    href: '/subscription',
    icon: CreditCard,
    roles: ['validator', 'searcher', 'researcher', 'admin']
  },
  {
    label: 'Education',
    href: '/education',
    icon: BookOpen,
    roles: ['validator', 'searcher', 'researcher', 'admin']
  }
]

export function Sidebar() {
  const { user } = useAuthStore()
  const [isOpen, setIsOpen] = useState(false)

  if (!user) return null

  const availableItems = navigationItems.filter(item => 
    item.roles.includes(user.role)
  )

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black-overlay z-30 md:hidden" 
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed md:static inset-y-0 left-0 z-40 w-64 bg-card border-r border-border transition-transform duration-300 md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-6 pt-16 md:pt-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-primary" />
              <div>
                <h2 className="text-lg font-semibold">MEV Analytics</h2>
                <p className="text-xs text-muted-foreground capitalize">
                  {user.role} Dashboard
                </p>
              </div>
            </div>
          </div>

          <nav className="flex-1 px-4 pb-4">
            <ul className="space-y-2">
              {availableItems.map((item) => (
                <li key={item.href}>
                  <NavLink
                    to={item.href}
                    onClick={() => setIsOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )
                    }
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          {/* Footer with user info */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                <span className="text-xs font-medium text-primary-foreground">
                  {user.email.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.email}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {user.role}
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}