'use client';

import { useAuth } from '@/lib/auth';
import { LogOut, Moon, Sun, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

// Map routes to page titles
const getPageInfo = (pathname: string) => {
  const routes: Record<string, { title: string; parent?: string }> = {
    '/dashboard': { title: 'Overview' },
    '/dashboard/conversations': { title: 'Conversations' },
    '/dashboard/knowledge': { title: 'Knowledge Base' },
    '/dashboard/ai-rules': { title: 'AI Rules' },
    '/dashboard/analytics': { title: 'Analytics' },
    '/dashboard/sales-products': { title: 'Sales & Products' },
    '/dashboard/ads': { title: 'Ad Studio' },
    '/dashboard/integrations': { title: 'Integrations' },
    '/dashboard/users': { title: 'Users & Roles' },
    '/dashboard/handoff': { title: 'Handoff' },
    '/dashboard/leads': { title: 'Leads' },
    '/dashboard/billing': { title: 'Billing' },
    '/dashboard/settings': { title: 'Settings' },
    '/dashboard/security': { title: 'Security' },
    '/dashboard/notifications': { title: 'Notifications' },
    '/dashboard/onboarding': { title: 'Onboarding' },
  };

  return routes[pathname] || { title: 'Dashboard' };
};

export default function Header() {
  const { user, logout } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const pathname = usePathname();
  const pageInfo = getPageInfo(pathname);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setDarkMode(isDark);
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Breadcrumb / Page Title */}
        <div className="flex items-center space-x-2">
          <Link 
            href="/dashboard" 
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            Dashboard
          </Link>
          {pathname !== '/dashboard' && (
            <>
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                {pageInfo.title}
              </h1>
            </>
          )}
          {pathname === '/dashboard' && (
            <>
              <ChevronRight className="h-4 w-4 text-gray-400" />
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                {pageInfo.title}
              </h1>
            </>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {user?.full_name || user?.email}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {user?.role}
              </p>
            </div>
            <button
              onClick={logout}
              className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}



