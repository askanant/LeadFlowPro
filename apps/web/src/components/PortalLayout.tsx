import { Link, useLocation, Outlet } from 'react-router-dom';
import { LayoutDashboard, Inbox, PhoneCall, Users, Hash, LogOut, Zap, Settings } from 'lucide-react';
import { cn } from '../lib/cn';
import { useAuthStore } from '../store/auth';
import { logout } from '../api/auth';

const navItems = [
  { to: '/portal', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { to: '/portal/leads', label: 'Lead Inbox', icon: Inbox },
  { to: '/portal/calls', label: 'Call Recordings', icon: PhoneCall },
  { to: '/portal/agents', label: 'Agents', icon: Users, adminOnly: true },
  { to: '/portal/numbers', label: 'Numbers', icon: Hash, adminOnly: true },
  { to: '/portal/settings', label: 'Settings', icon: Settings },
];

export function PortalLayout() {
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  const isCompanyAdmin = user?.role === 'company_admin';

  return (
    <div className="flex h-screen bg-[#f5f5f7]">
      {/* Sidebar */}
      <aside className="w-64 bg-white flex flex-col" style={{ boxShadow: '1px 0 0 0 rgba(0,0,0,0.06)' }}>
        {/* Brand */}
        <div className="px-6 py-5 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-sm">
            <Zap size={15} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 leading-none">LeadFlow Pro</p>
            <p className="text-[10px] text-gray-600 mt-0.5 uppercase tracking-wider">Client Portal</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-0.5">
          {navItems
            .filter(({ adminOnly }) => !adminOnly || isCompanyAdmin)
            .map(({ to, label, icon: Icon, exact }) => {
              const active = exact
                ? location.pathname === to
                : location.pathname.startsWith(to);
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

        {/* User */}
        <div className="px-4 py-4 border-t border-gray-100/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold uppercase">
              {user?.name?.[0] ?? user?.email?.[0] ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate">{user?.name ?? user?.email}</p>
              <p className="text-[10px] text-gray-600 mt-0.5">{isCompanyAdmin ? 'Company Admin' : 'Agent'}</p>
            </div>
            <button
              onClick={() => logout()}
              className="text-gray-500 hover:text-gray-700 transition-colors"
              title="Log out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
