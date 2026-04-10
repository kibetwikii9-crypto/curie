'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
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
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

type NavSubItem = { name: string; href: string };
type NavItem = { name: string; href: string; icon: any; subItems?: NavSubItem[] };
type NavSection = { id: string; title: string; items: NavItem[] };

const sections: NavSection[] = [
  {
    id: 'workspace',
    title: 'Core',
    items: [
      { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Conversations', href: '/dashboard/conversations', icon: MessageSquare },
      { name: 'Knowledge Base', href: '/dashboard/knowledge', icon: BookOpen },
      { name: 'AI Rules', href: '/dashboard/ai-rules', icon: Zap },
      { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
      { name: 'Leads', href: '/dashboard/leads', icon: TrendingUp },
    ],
  },
  {
    id: 'growth',
    title: 'Growth',
    items: [
      {
        name: 'Ad Studio',
        href: '/dashboard/ads',
        icon: Video,
        subItems: [
          { name: 'Campaigns', href: '/dashboard/ads' },
          { name: 'Create Campaign', href: '/dashboard/ads/create' },
          { name: 'Video Ads', href: '/dashboard/ads/video' },
          { name: 'Video Templates', href: '/dashboard/ads/video/templates' },
          { name: 'Create Video', href: '/dashboard/ads/video/create' },
        ],
      },
      {
        name: 'Integrations',
        href: '/dashboard/integrations',
        icon: Plug,
        subItems: [
          { name: 'Connected', href: '/dashboard/integrations?view=connected' },
          { name: 'Marketplace', href: '/dashboard/integrations?view=marketplace' },
          { name: 'Health Check', href: '/dashboard/integrations?view=health' },
        ],
      },
    ],
  },
  {
    id: 'team',
    title: 'Team',
    items: [
      { name: 'Users & Roles', href: '/dashboard/users', icon: Users },
      { name: 'Handoff', href: '/dashboard/handoff', icon: UserCheck },
      { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
    ],
  },
  {
    id: 'account',
    title: 'Account',
    items: [
      {
        name: 'Billing',
        href: '/dashboard/billing',
        icon: CreditCard,
        subItems: [
          { name: 'Overview', href: '/dashboard/billing' },
          { name: 'Plans', href: '/dashboard/billing/plans' },
          { name: 'Invoices', href: '/dashboard/billing/invoices' },
          { name: 'Payment Methods', href: '/dashboard/billing/payment-methods' },
        ],
      },
      { name: 'Settings', href: '/dashboard/settings', icon: Settings },
      { name: 'Security', href: '/dashboard/security', icon: Shield },
      { name: 'Onboarding', href: '/dashboard/onboarding', icon: CheckCircle2 },
    ],
  },
];

interface SidebarProps {
  mode?: 'full' | 'icons' | 'hidden';
  onNavigate?: () => void;
}

export default function Sidebar({
  mode = 'full',
  onNavigate,
}: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    workspace: true,
    growth: true,
    team: true,
    account: true,
  });

  const getUrlParts = (href: string) => {
    const [path, query = ''] = href.split('?');
    const params = new URLSearchParams(query);
    return { path, params };
  };

  const isItemActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const isSubItemActive = (href: string) => {
    const { path, params } = getUrlParts(href);
    if (pathname !== path) return false;
    const viewParam = params.get('view');
    if (!viewParam) return true;
    return searchParams.get('view') === viewParam;
  };

  const isIconsOnly = mode === 'icons';
  const isHidden = mode === 'hidden';

  return (
    <div className={cn('flex h-full md:flex-shrink-0 transition-all duration-300', isHidden && 'w-0 overflow-hidden')}>
      <aside className={cn('p-3 transition-all duration-300', isIconsOnly ? 'w-24' : 'w-72')}>
        <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white/95 shadow-xl shadow-gray-200/60 backdrop-blur dark:border-gray-700/80 dark:bg-gray-800/95 dark:shadow-gray-900/40">
          <div className="border-b border-gray-200/80 px-4 py-4 dark:border-gray-700/80">
            {isIconsOnly ? (
              <div className="flex items-center justify-center">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-r from-primary-600 to-blue-600 text-lg font-extrabold text-white shadow-lg">
                  A
                </span>
              </div>
            ) : (
              <h1 className="bg-gradient-to-r from-primary-600 to-blue-600 bg-clip-text text-2xl font-extrabold text-transparent">
                Automify AI
              </h1>
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col">
            <nav className="hide-scrollbar mt-3 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
              {sections.map((section) => (
                <div key={section.id} className="mb-3">
                  {!isIconsOnly && (
                    <button
                      type="button"
                      onClick={() => setOpenSections((prev) => ({ ...prev, [section.id]: !prev[section.id] }))}
                      className="mb-1 flex w-full items-center justify-between rounded-lg px-2 py-1 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 hover:bg-gray-50 dark:text-gray-500 dark:hover:bg-gray-700/40"
                    >
                      <span>{section.title}</span>
                      {openSections[section.id] ? (
                        <ChevronDown className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5" />
                      )}
                    </button>
                  )}

                  {(isIconsOnly || openSections[section.id]) &&
                    section.items.map((item) => {
                      const isActive = isItemActive(item.href);
                      const showSubItems = !isIconsOnly && item.subItems && isActive;

                      return (
                        <div key={item.name} className="mb-1">
                          <Link
                            href={item.href}
                            onClick={onNavigate}
                            className={cn(
                              'group relative flex items-center rounded-xl text-sm font-medium transition-all duration-200',
                              isIconsOnly ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5',
                              isActive
                                ? 'bg-gradient-to-r from-primary-500/15 to-blue-500/10 text-primary-700 shadow-sm ring-1 ring-primary-200 dark:from-primary-400/20 dark:to-blue-400/10 dark:text-primary-300 dark:ring-primary-700/60'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700/70 dark:hover:text-white'
                            )}
                            title={isIconsOnly ? item.name : undefined}
                          >
                            {isActive && (
                              <span className={cn(
                                'absolute bg-primary-500 dark:bg-primary-400',
                                isIconsOnly ? 'bottom-0 left-1/2 h-1 w-5 -translate-x-1/2 rounded-t-full' : 'left-0 top-2.5 h-6 w-1 rounded-r-full'
                              )} />
                            )}
                            <item.icon
                              className={cn(
                                'h-4.5 w-4.5 flex-shrink-0',
                                isActive
                                  ? 'text-primary-600 dark:text-primary-300'
                                  : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200'
                              )}
                            />
                            {!isIconsOnly && <span>{item.name}</span>}
                          </Link>

                          {showSubItems && (
                            <div className="ml-9 mt-1 space-y-1">
                              {item.subItems!.map((subItem) => {
                                const subActive = isSubItemActive(subItem.href);
                                return (
                                  <Link
                                    key={subItem.href}
                                    href={subItem.href}
                                    onClick={onNavigate}
                                    className={cn(
                                      'block rounded-md px-2 py-1.5 text-xs transition',
                                      subActive
                                        ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300'
                                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800 dark:text-gray-400 dark:hover:bg-gray-700/50 dark:hover:text-gray-200'
                                    )}
                                  >
                                    {subItem.name}
                                  </Link>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              ))}
            </nav>
          </div>
        </div>
      </aside>
    </div>
  );
}



