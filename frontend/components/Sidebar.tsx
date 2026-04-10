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
  { name: 'Integrations', href: '/dashboard/integrations', icon: Plug },
  { name: 'Users & Roles', href: '/dashboard/users', icon: Users },
  { name: 'Handoff', href: '/dashboard/handoff', icon: UserCheck },
  { name: 'Leads', href: '/dashboard/leads', icon: TrendingUp },
  { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  { name: 'Security', href: '/dashboard/security', icon: Shield },
  { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
  { name: 'Onboarding', href: '/dashboard/onboarding', icon: CheckCircle2 },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full md:flex-shrink-0">
      <aside className="w-72 p-3">
        <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white/95 shadow-xl shadow-gray-200/60 backdrop-blur dark:border-gray-700/80 dark:bg-gray-800/95 dark:shadow-gray-900/40">
          <div className="border-b border-gray-200/80 px-5 py-5 dark:border-gray-700/80">
            <div className="mb-2 inline-flex items-center rounded-full border border-primary-200 bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700 dark:border-primary-700/60 dark:bg-primary-900/20 dark:text-primary-300">
              Workspace
            </div>
            <h1 className="bg-gradient-to-r from-primary-600 to-blue-600 bg-clip-text text-2xl font-extrabold text-transparent">
              Automify AI
            </h1>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Command center
            </p>
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="px-5 pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                Navigation
              </p>
            </div>

            <nav className="mt-3 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
              {navigation.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'bg-gradient-to-r from-primary-500/15 to-blue-500/10 text-primary-700 shadow-sm ring-1 ring-primary-200 dark:from-primary-400/20 dark:to-blue-400/10 dark:text-primary-300 dark:ring-primary-700/60'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700/70 dark:hover:text-white'
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-2.5 h-6 w-1 rounded-r-full bg-primary-500 dark:bg-primary-400" />
                    )}
                    <item.icon
                      className={cn(
                        'h-4.5 w-4.5 flex-shrink-0',
                        isActive
                          ? 'text-primary-600 dark:text-primary-300'
                          : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200'
                      )}
                    />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      </aside>
    </div>
  );
}



