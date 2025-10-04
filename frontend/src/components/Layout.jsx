import React, { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  Zap, 
  Users, 
  Settings, 
  Menu, 
  X, 
  Moon, 
  Sun,
  Bell,
  User,
  ChevronRight,
  BookOpen,
  TrendingUp,
  Activity,
  Play
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import Button from './common/Button';
import ClusterSelector from './ClusterSelector';

const navigation = [
  { name: 'Dashboard', href: '/', icon: BarChart3 },
  { name: 'Live Feed', href: '/live', icon: Activity },
  { name: 'Opportunities', href: '/opportunities', icon: Zap },
  { name: 'Validators', href: '/validators', icon: Users },
  { name: 'Analytics', href: '/analytics', icon: TrendingUp },
  { name: 'Simulations', href: '/simulations', icon: BarChart3 },
  { name: 'Activity', href: '/activity', icon: Activity },
  { name: 'Education', href: '/education', icon: BookOpen },
  { name: 'Settings', href: '/settings', icon: Settings },
];

const getBreadcrumbs = (pathname) => {
  const paths = pathname.split('/').filter(Boolean);
  const breadcrumbs = [{ name: 'Dashboard', href: '/' }];
  
  let currentPath = '';
  paths.forEach((path) => {
    currentPath += `/${path}`;
    const navItem = navigation.find(item => item.href === currentPath);
    if (navItem) {
      breadcrumbs.push({ name: navItem.name, href: currentPath });
    } else {
      breadcrumbs.push({ 
        name: path.charAt(0).toUpperCase() + path.slice(1), 
        href: currentPath 
      });
    }
  });
  
  return breadcrumbs;
};

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white dark:bg-gray-800">
          <div className="flex h-16 items-center justify-between px-4">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              MEV Analytics
            </h1>
            <Button variant="ghost" size="sm" onClick={() => setSidebarOpen(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`
                    group flex items-center px-2 py-2 text-sm font-medium rounded-md
                    ${isActive
                      ? 'bg-primary-100 dark:bg-primary-900 text-primary-900 dark:text-primary-100'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }
                  `}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <div className="flex h-16 items-center px-4">
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              MEV Analytics
            </h1>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`
                    group flex items-center px-2 py-2 text-sm font-medium rounded-md
                    ${isActive
                      ? 'bg-primary-100 dark:bg-primary-900 text-primary-900 dark:text-primary-100'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1" />
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <ClusterSelector />
              
              <Button variant="ghost" size="sm" onClick={toggleTheme}>
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
              
              <Button variant="ghost" size="sm">
                <Bell className="w-5 h-5" />
              </Button>

              <div className="relative" ref={profileRef}>
                <div className="flex items-center gap-x-2">
                  <div className="hidden sm:flex sm:flex-col sm:items-end">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {user?.email || 'Guest'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {user?.role || 'Viewer'}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setProfileOpen(!profileOpen)}>
                    <User className="w-5 h-5" />
                  </Button>
                </div>
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          navigate('/profile');
                          setProfileOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Profile
                      </button>
                      <button
                        onClick={() => {
                          logout();
                          setProfileOpen(false);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Breadcrumbs */}
        {location.pathname !== '/' && (
          <div className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <nav className="flex py-3" aria-label="Breadcrumb">
                <ol className="flex items-center space-x-2">
                  {getBreadcrumbs(location.pathname).map((breadcrumb, index, array) => (
                    <li key={breadcrumb.href} className="flex items-center">
                      {index > 0 && (
                        <ChevronRight className="w-4 h-4 text-gray-400 mx-2" />
                      )}
                      {index === array.length - 1 ? (
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {breadcrumb.name}
                        </span>
                      ) : (
                        <Link
                          to={breadcrumb.href}
                          className="text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          {breadcrumb.name}
                        </Link>
                      )}
                    </li>
                  ))}
                </ol>
              </nav>
            </div>
          </div>
        )}

        {/* Page content */}
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}