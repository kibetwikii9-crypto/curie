'use client';

import { useAuth } from '@/lib/auth';
import { LogOut, Moon, Sun, Menu } from 'lucide-react';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface HeaderProps {
  onMenuToggle?: () => void;
}

const pageNames: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/dashboard/conversations': 'Conversations',
  '/dashboard/knowledge': 'Knowledge Base',
  '/dashboard/ai-rules': 'AI Rules',
  '/dashboard/analytics': 'Analytics',
  '/dashboard/ads': 'Ad Studio',
  '/dashboard/integrations': 'Integrations',
  '/dashboard/users': 'Users & Roles',
  '/dashboard/handoff': 'Handoff',
  '/dashboard/leads': 'Leads',
  '/dashboard/billing': 'Billing',
  '/dashboard/settings': 'Settings',
  '/dashboard/security': 'Security',
  '/dashboard/notifications': 'Notifications',
  '/dashboard/onboarding': 'Onboarding',
  '/dashboard/sales-products': 'Sales & Products',
};

function toTitleCase(value: string): string {
  return value
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getBreadcrumbTitle(pathname: string): string {
  if (!pathname || pathname === '/') return 'Dashboard';

  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return 'Dashboard';

  const breadcrumbs: string[] = [];
  let currentPath = '';

  for (const part of parts) {
    currentPath += `/${part}`;
    breadcrumbs.push(pageNames[currentPath] || toTitleCase(part));
  }

  return breadcrumbs.join(' > ');
}

export default function Header({ onMenuToggle }: HeaderProps = {}) {
  const { user, logout } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const pathname = usePathname();
  const currentPage = getBreadcrumbTitle(pathname);

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
        <div className="flex items-center space-x-4">
          {/* Hamburger Menu - Mobile */}
          <button
            onClick={onMenuToggle}
            className="md:hidden p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Toggle menu"
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {currentPage}
          </h2>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <div className="flex items-center space-x-3">
            <div className="text-right hidden sm:block">
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



