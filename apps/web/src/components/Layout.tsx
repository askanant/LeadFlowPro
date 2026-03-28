import { useCallback } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Building2,
  Megaphone,
  Users,
  Phone,
  Settings,
  LogOut,
  Zap,
  BarChart3,
  CreditCard,
  TrendingUp,
  CheckSquare,
  Bell,
  Calendar,
  FileText,
  Shield,
  Target,
  DollarSign,
  Rocket,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '../lib/cn';
import { useAuthStore } from '../store/auth';
import { logout } from '../api/auth';
import { useUnreadNotificationCount } from '../api/notifications';
import { useSocketEvent } from '../hooks/useSocketEvent';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/reporting', label: 'Advanced Reporting', icon: TrendingUp },
  { to: '/companies', label: 'Companies', icon: Building2, adminOnly: true },
  { to: '/campaigns', label: 'Campaigns', icon: Megaphone },
  { to: '/campaign-optimizer', label: 'Campaign Optimizer', icon: Target },
  { to: '/spend-optimizer', label: 'Spend Optimizer', icon: DollarSign },
  { to: '/lead-flow', label: 'Lead Flow Booster', icon: Rocket },
  { to: '/leads', label: 'Leads', icon: Users },
  { to: '/insights', label: 'Lead Insights', icon: TrendingUp },
  { to: '/workflows', label: 'Workflows', icon: Zap },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/scheduled-reports', label: 'Scheduled Reports', icon: Calendar },
  { to: '/report-builder', label: 'Report Builder', icon: FileText },
  { to: '/audit-logs', label: 'Audit Logs', icon: Shield, adminOnly: true },
  { to: '/telephony', label: 'Telephony', icon: Phone },
  { to: '/billing', label: 'Billing', icon: CreditCard },
];

export function Layout() {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const { data: unreadCount } = useUnreadNotificationCount();

  const handleNotification = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
  }, [queryClient]);

  useSocketEvent('notification:new', handleNotification);

  return (
    <div className="flex h-screen bg-[#f5f5f7]">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:px-4 focus:py-2 focus:bg-indigo-600 focus:text-white focus:rounded-md focus:m-2">Skip to content</a>
      {/* Sidebar */}
      <aside className="w-64 bg-white flex flex-col" style={{ boxShadow: '1px 0 0 0 rgba(0,0,0,0.06)' }}>
        {/* Brand */}
        <div className="px-6 py-5 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-sm">
            <Zap size={15} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 leading-none">LeadFlow Pro</p>
            <p className="text-[10px] text-gray-600 mt-0.5 uppercase tracking-wider">Admin</p>
          </div>
        </div>

        {/* Nav */}
        <nav aria-label="Main navigation" className="flex-1 px-3 py-2 space-y-0.5">
          {navItems.filter(({ adminOnly }) => !adminOnly || user?.role === 'super_admin').map(({ to, label, icon: Icon }) => {
            const active = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                  active
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                )}
              >
                <Icon size={16} className={active ? 'text-blue-600' : ''} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Settings */}
        <div className="px-3 pb-2">
          <Link
            to="/settings"
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 w-full',
              location.pathname.startsWith('/settings')
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'
            )}
          >
            <Settings size={16} className={location.pathname.startsWith('/settings') ? 'text-blue-600' : ''} />
            Settings
          </Link>
        </div>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-gray-100/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold uppercase">
              {user?.name?.[0] ?? user?.email?.[0] ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate">{user?.name ?? user?.email}</p>
              <p className="text-[10px] text-gray-600 capitalize mt-0.5">{user?.role?.replace('_', ' ')}</p>
            </div>
            <button
              className="relative text-gray-500 hover:text-gray-700 transition-colors"
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell size={14} />
              {(unreadCount ?? 0) > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount! > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => logout()}
              className="text-gray-500 hover:text-gray-700 transition-colors"
              title="Log out"
              aria-label="Log out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main id="main-content" className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
