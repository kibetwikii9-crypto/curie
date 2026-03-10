'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  MessageSquare,
  BookOpen,
  Settings,
  BarChart3,
  Video,
  Zap,
  Plug,
  Users,
  UserCheck,
  TrendingUp,
  CreditCard,
  Shield,
  Bell,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigation = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Conversations', href: '/dashboard/conversations', icon: MessageSquare },
  { name: 'Knowledge Base', href: '/dashboard/knowledge', icon: BookOpen },
  { name: 'AI Rules', href: '/dashboard/ai-rules', icon: Zap },
  { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { name: 'Ad Studio', href: '/dashboard/ads', icon: Video },
  { name: 'Integrations', href: '/dashboard/integrations', icon: Plug, comingSoon: true },
  { name: 'Users & Roles', href: '/dashboard/users', icon: Users, comingSoon: true },
  { name: 'Handoff', href: '/dashboard/handoff', icon: UserCheck, comingSoon: true },
  { name: 'Leads', href: '/dashboard/leads', icon: TrendingUp, comingSoon: true },
  { name: 'Billing', href: '/dashboard/billing', icon: CreditCard, comingSoon: true },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  { name: 'Security', href: '/dashboard/security', icon: Shield, comingSoon: true },
  { name: 'Notifications', href: '/dashboard/notifications', icon: Bell, comingSoon: true },
  { name: 'Onboarding', href: '/dashboard/onboarding', icon: CheckCircle2, comingSoon: true },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="hidden md:flex md:flex-shrink-0">
      <div className="flex flex-col w-64">
        <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <div className="flex items-center flex-shrink-0 px-4">
            <h1 className="text-2xl font-bold text-primary-600">Curie</h1>
          </div>
          <div className="mt-5 flex-grow flex flex-col">
            <nav className="flex-1 px-2 space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'group flex items-center justify-between px-2 py-2 text-sm font-medium rounded-md',
                      isActive
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white',
                      item.comingSoon && 'opacity-75'
                    )}
                  >
                    <div className="flex items-center">
                      <item.icon
                        className={cn(
                          'mr-3 flex-shrink-0 h-6 w-6',
                          isActive
                            ? 'text-primary-500'
                            : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'
                        )}
                      />
                      {item.name}
                    </div>
                    {item.comingSoon && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">Soon</span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
}



