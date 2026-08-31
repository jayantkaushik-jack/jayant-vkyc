import { cn } from '@vkyc/shared/lib/cn';
import type { NonApprovedStatus, StatusFlowSummary } from '@vkyc/shared/data/adminSelectors';

interface FlowNode {
  id: string;
  x: number;
  y: number;
  label: string;
  count: number;
  tone: 'pass' | 'warn' | 'fail' | 'muted';
  status?: NonApprovedStatus;
}

const TONE_CLASS: Record<FlowNode['tone'], string> = {
  pass: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  warn: 'bg-amber-50 border-amber-200 text-amber-800',
  fail: 'bg-rose-50 border-rose-200 text-rose-800',
  muted: 'bg-slate-50 border-slate-200 text-slate-500 opacity-60',
};

export function StatusFlowDiagram({
  summary,
  selectedStatus,
  onSelectStatus,
}: {
  summary: StatusFlowSummary;
  selectedStatus: NonApprovedStatus | null;
  onSelectStatus: (status: NonApprovedStatus | null) => void;
}) {
  const total = Math.max(summary.totalLeads, 1);
  const nodes: FlowNode[] = [
    { id: 'leads', x: 20, y: 180, label: 'Leads', count: summary.totalLeads, tone: 'pass' },
    { id: 'connected', x: 220, y: 110, label: 'Call Connected', count: summary.callConnected, tone: 'pass' },
    { id: 'dropped', x: 220, y: 250, label: 'Call Dropped', count: summary.callDropped, tone: 'fail', status: 'User Dropped' },
    { id: 'agent-approved', x: 430, y: 70, label: 'Agent Approved', count: summary.agentApproved, tone: 'pass' },
    { id: 'agent-unable', x: 430, y: 180, label: 'Agent Unable to Verify', count: summary.agentUnable, tone: 'warn', status: 'Unable to Verify' },
    { id: 'agent-rejected', x: 430, y: 290, label: 'Agent Rejected', count: summary.agentRejected, tone: 'fail', status: 'Rejected' },
    { id: 'auditor-approved', x: 680, y: 70, label: 'Auditor Approved', count: summary.auditorApproved, tone: 'muted' },
    { id: 'auditor-recapture', x: 680, y: 180, label: 'Auditor Recapture', count: summary.auditorRecapture, tone: 'warn', status: 'Recapture' },
    { id: 'auditor-rejected', x: 680, y: 290, label: 'Auditor Rejected', count: summary.auditorRejected, tone: 'fail', status: 'Auditor Rejected' },
  ];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const links: Array<[string, string]> = [
    ['leads', 'connected'],
    ['leads', 'dropped'],
    ['connected', 'agent-approved'],
    ['connected', 'agent-unable'],
    ['connected', 'agent-rejected'],
    ['agent-approved', 'auditor-approved'],
    ['agent-approved', 'auditor-recapture'],
    ['agent-approved', 'auditor-rejected'],
  ];

  const pct = (count: number) => `${((count / total) * 100).toFixed(1)}%`;
  const activeFailureSelected = !!selectedStatus;

  return (
    <div className="space-y-3">
      <div className="relative w-full overflow-x-auto">
        <div className="relative min-w-[920px] h-[370px]">
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            {links.map(([fromId, toId]) => {
              const from = nodeMap.get(fromId)!;
              const to = nodeMap.get(toId)!;
              const x1 = from.x + 145;
              const y1 = from.y + 30;
              const x2 = to.x;
              const y2 = to.y + 30;
              const cx1 = x1 + 50;
              const cx2 = x2 - 50;
              return (
                <path
                  key={`${fromId}-${toId}`}
                  d={`M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke="#B6ACC8"
                  strokeWidth="2"
                />
              );
            })}
          </svg>
          {nodes.map((node) => {
            const isInteractive = !!node.status;
            const isActive = isInteractive && selectedStatus === node.status;
            const isDimmed = activeFailureSelected && isInteractive && !isActive;
            return (
              <button
                key={node.id}
                type="button"
                disabled={!isInteractive}
                onClick={() => isInteractive && onSelectStatus(isActive ? null : node.status!)}
                className={cn(
                  'absolute w-[145px] h-[60px] rounded-full border text-left px-4 py-2 shadow-sm transition',
                  TONE_CLASS[node.tone],
                  isInteractive ? 'cursor-pointer hover:scale-[1.01]' : 'cursor-default',
                  isActive && 'ring-2 ring-primary',
                  isDimmed && 'opacity-45',
                )}
                style={{ left: node.x, top: node.y }}
              >
                <p className="text-[11px] font-semibold leading-tight">{node.label}</p>
                <p className="text-[10px]">{node.count.toLocaleString()} ({pct(node.count)})</p>
                {node.id === 'auditor-approved' && (
                  <p className="text-[9px]">not included below</p>
                )}
              </button>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-text-muted">Excludes {summary.inReview.toLocaleString()} cases currently in auditor review.</p>
    </div>
  );
}
