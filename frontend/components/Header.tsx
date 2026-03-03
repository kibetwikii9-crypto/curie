'use client';

import { useAuth } from '@/lib/auth';
import { usePathname } from 'next/navigation';
import { LogOut, Moon, Sun, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';

// Page title mapping
const pageTitles: Record<string, string> = {
  '/dashboard': 'Overview',
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
  '/dashboard/billing/plans': 'Plans',
  '/dashboard/billing/payment-methods': 'Payment Methods',
  '/dashboard/billing/invoices': 'Invoices',
  '/dashboard/billing/checkout': 'Checkout',
  '/dashboard/settings': 'Settings',
  '/dashboard/security': 'Security',
  '/dashboard/notifications': 'Notifications',
  '/dashboard/onboarding': 'Onboarding',
  '/dashboard/sales-products': 'Products',
};

export default function Header() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [darkMode, setDarkMode] = useState(false);

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

  // Get current page title
  const currentPageTitle = pageTitles[pathname] || 'Dashboard';

  // Build breadcrumbs
  const pathSegments = pathname.split('/').filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/');
    return {
      name: pageTitles[path] || segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, ' '),
      path: path,
      isLast: index === pathSegments.length - 1
    };
  });

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex-1 md:block hidden">
          {/* Page Title & Breadcrumb - Hidden on mobile to save space */}
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400 mb-1">
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.path} className="flex items-center">
                {index > 0 && <ChevronRight className="h-4 w-4 mx-1" />}
                <span className={crumb.isLast ? 'text-gray-900 dark:text-white font-medium' : 'hover:text-gray-700 dark:hover:text-gray-300'}>
                  {crumb.name}
                </span>
              </div>
            ))}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {currentPageTitle}
          </h2>
        </div>
        {/* Mobile title - centered */}
        <div className="md:hidden flex-1 text-center">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {currentPageTitle}
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



