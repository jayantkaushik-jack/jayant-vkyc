import { AlertTriangle } from 'lucide-react';
import { Card } from '@vkyc/shared/components/ui/Card';
import { useAdminConfig } from '@vkyc/shared/data/sessionStore';
import { getDashboardAlerts } from '@vkyc/shared/data/adminSelectors';
import { cn } from '@vkyc/shared/lib/cn';
import { usePartnerId } from '@admin/features/admin/PartnerFilterContext';

export function AlertsCard() {
  // Subscribe to config so threshold edits re-evaluate alerts live.
  useAdminConfig();
  const partnerId = usePartnerId();
  const all = getDashboardAlerts(partnerId);
  // Home surfaces only the most urgent handful — the full set lives in the
  // alerts detail views. Critical first, then warnings.
  const ranked = [...all].sort((a, b) =>
    (a.severity === b.severity ? 0 : a.severity === 'critical' ? -1 : 1));
  const MAX_SHOWN = 2;
  const alerts = ranked.slice(0, MAX_SHOWN);
  const hidden = ranked.length - alerts.length;

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-text flex items-center gap-2">
          <AlertTriangle size={16} className="text-warning" /> Alerts
        </h2>
        <span className="text-xs text-text-muted">{ranked.length} active</span>
      </div>
      {alerts.length === 0 ? (
        <p className="text-sm text-text-muted py-4 text-center">No active alerts.</p>
      ) : (
        <ul className="space-y-1.5">
          {alerts.map((a) => (
            <li
              key={a.id}
              className={cn(
                'flex items-start gap-3 rounded-lg border px-3 py-2 text-sm',
                a.severity === 'critical' ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50',
              )}
            >
              <span
                className={cn(
                  'shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase',
                  a.severity === 'critical' ? 'bg-danger text-white' : 'bg-warning text-white',
                )}
              >
                {a.severity}
              </span>
              <span className="flex-1 text-text">{a.message}</span>
            </li>
          ))}
        </ul>
      )}
      {hidden > 0 && (
        <p className="mt-2 text-xs text-text-muted">+{hidden} more active alert{hidden > 1 ? 's' : ''}</p>
      )}
    </Card>
  );
}
