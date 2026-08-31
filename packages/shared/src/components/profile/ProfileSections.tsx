import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Card } from '../ui/Card';
import { cn } from '../../lib/cn';

export function ProfileAccordion({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card padding={false} className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-primary-soft/50 transition-colors"
      >
        <span className="font-semibold text-sm">{title}</span>
        <ChevronDown
          size={18}
          className={cn('text-text-muted transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && <div className="px-5 pb-5 border-t border-border">{children}</div>}
    </Card>
  );
}

export function ProfileDetailGrid({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <dl className="space-y-3 pt-4">
      {rows.map(({ label, value }) => (
        <div key={label} className="grid grid-cols-[140px_1fr] gap-2 text-sm">
          <dt className="text-text-muted">{label}</dt>
          <dd className="text-text">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ProfileLeavesList({ leaves }: { leaves: { type: string; dates: string; status: string }[] }) {
  return (
    <div className="pt-4 space-y-3">
      {leaves.map((leave) => (
        <div
          key={`${leave.type}-${leave.dates}`}
          className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 text-sm"
        >
          <div>
            <p className="font-medium">{leave.type}</p>
            <p className="text-text-muted text-xs">{leave.dates}</p>
          </div>
          <span className="text-success text-xs font-medium">{leave.status}</span>
        </div>
      ))}
    </div>
  );
}

export function managerEmailFromName(managerName: string): string {
  return `${managerName.toLowerCase().replace(/\s+/g, '.')}@cashfree.com`;
}

export function formatWorkPlanSummary(workPlan: { day: string; officeStart: string; officeEnd: string; breakStart: string; breakEnd: string }[]) {
  const first = workPlan[0];
  return {
    workingDays: workPlan.map((d) => d.day).join(', '),
    officeTimings: first ? `${first.officeStart} – ${first.officeEnd}` : '—',
    breakTimings: first ? `${first.breakStart} – ${first.breakEnd}` : '—',
  };
}
