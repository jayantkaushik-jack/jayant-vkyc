import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Radio, Users, BarChart3, ShieldCheck, Briefcase, UserCog, Settings, FileText,
} from 'lucide-react';
import { cn } from '@vkyc/shared/lib/cn';
import { NAV_ITEMS } from '@admin/features/admin/constants';

const ICONS: Record<string, typeof LayoutDashboard> = {
  Dashboard: LayoutDashboard,
  'Live Ops': Radio,
  Customers: Users,
  'Partner Analytics': BarChart3,
  'Rejection & Failure Reasons': ShieldCheck,
  Productivity: Briefcase,
  Users: UserCog,
  Configuration: Settings,
  Configure: Settings,
  Reports: FileText,
};

export function AdminSidebar() {
  return (
    <aside className="fixed left-0 top-14 bottom-0 w-[232px] bg-surface border-r border-border z-30 flex flex-col py-4 px-3">
      <nav className="flex flex-col gap-1 flex-1">
        {NAV_ITEMS.map(({ to, label, ...rest }) => {
          const Icon = ICONS[label] ?? LayoutDashboard;
          return (
            <NavLink
              key={to}
              to={to}
              end={'end' in rest ? rest.end : false}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-text-muted hover:bg-primary-soft hover:text-text',
                )
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}

export function useAdminSidebarOffset(): string {
  return 'pl-[232px]';
}
