import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, AlertTriangle, FileText, LogOut } from 'lucide-react';
import { useAuth } from '@vkyc/shared/features/auth/AuthContext';
import { cn } from '@vkyc/shared/lib/cn';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/reasons', label: 'Rejection & Failure Reasons', icon: AlertTriangle },
  { to: '/reports', label: 'Reports', icon: FileText },
];

export function PartnerSidebar() {
  const { logout } = useAuth();
  return (
    <aside className="fixed left-0 top-14 bottom-0 w-[232px] bg-surface border-r border-border z-30 flex flex-col py-4 px-3">
      <nav className="flex flex-col gap-1 flex-1">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-white'
                  : 'text-text-muted hover:bg-primary-soft hover:text-text',
              )
            }
          >
            <Icon size={18} className="shrink-0" />
            <span className="leading-tight">{label}</span>
          </NavLink>
        ))}
      </nav>
      <button
        type="button"
        onClick={logout}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-text-muted hover:bg-primary-soft hover:text-text transition-colors"
      >
        <LogOut size={18} />
        Sign out
      </button>
    </aside>
  );
}
