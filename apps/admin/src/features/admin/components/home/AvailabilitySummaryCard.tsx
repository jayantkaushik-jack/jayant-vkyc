import { useMemo, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { Avatar } from '@vkyc/shared/components/ui/Avatar';
import { cn } from '@vkyc/shared/lib/cn';
import {
  getAgentsByStatus,
  getAuditorsByStatus,
  AVAILABILITY_DOT_COLORS,
  type AvailabilityStatus,
  type AvailabilityPerson,
} from '@vkyc/shared/data/adminSelectors';
import { SectionCard } from '@admin/features/admin/components/SectionCard';
import { usePartnerId } from '@admin/features/admin/PartnerFilterContext';

type Tab = 'agents' | 'auditors';

function PeopleList({ people }: { people: AvailabilityPerson[] }) {
  const [query, setQuery] = useState('');
  const searchable = people.length > 10;

  const filtered = useMemo(() => {
    if (!query.trim()) return people;
    const q = query.toLowerCase();
    return people.filter(
      (p) =>
        p.name.toLowerCase().includes(q)
        || p.employeeId.toLowerCase().includes(q)
        || p.partners.some((partner) => partner.toLowerCase().includes(q)),
    );
  }, [people, query]);

  return (
    <div className="bg-bg/60 rounded-lg border border-border p-3 mt-1">
      {searchable && (
        <div className="relative mb-2">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name, ID or partner…"
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      )}
      <div className="max-h-64 overflow-y-auto divide-y divide-border/60">
        {filtered.map((p) => (
          <div key={p.id} className="flex items-center gap-3 py-2">
            <Avatar person={{ id: p.id, name: p.name }} size="xs" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">{p.name}</p>
              <p className="text-[10px] text-text-muted">{p.employeeId}</p>
            </div>
            {p.partners.length > 0 && (
              <div className="hidden md:flex flex-wrap gap-1 max-w-[180px] justify-end">
                {p.partners.map((partner) => (
                  <span key={partner} className="px-1.5 py-0.5 rounded bg-primary-soft text-primary text-[9px] font-medium">
                    {partner}
                  </span>
                ))}
              </div>
            )}
            <span className="text-[10px] text-text-muted whitespace-nowrap w-[140px] text-right">{p.context}</span>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-text-muted py-3 text-center">No matches.</p>
        )}
      </div>
    </div>
  );
}

export function AvailabilitySummaryCard() {
  const [tab, setTab] = useState<Tab>('agents');
  const [expanded, setExpanded] = useState<AvailabilityStatus | null>(null);
  const partnerId = usePartnerId();

  const tabs = (
    <div className="flex gap-1 rounded-lg border border-border p-0.5">
      {(['agents', 'auditors'] as Tab[]).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => { setTab(t); setExpanded(null); }}
          className={cn(
            'px-3 py-1 rounded-md text-xs capitalize transition-colors',
            tab === t ? 'bg-primary text-white' : 'text-text-muted hover:text-text',
          )}
        >
          {t}
        </button>
      ))}
    </div>
  );

  return (
    <SectionCard
      title="Availability summary"
      headerRight={tabs}
      className="h-full flex flex-col"
      bodyClassName="flex-1"
    >
      {({ nonce }) => {
        const summary = tab === 'agents' ? getAgentsByStatus(partnerId) : getAuditorsByStatus();
        void nonce;
        return (
          <div>
            <div className="flex items-center gap-2 text-xs text-text-muted mb-3">
              <span>Total onboarded: <strong className="text-text">{summary.totalOnboarded}</strong></span>
              <span>·</span>
              <span>Present today: <strong className="text-text">{summary.present}</strong></span>
            </div>

            <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 text-[11px] uppercase tracking-wide text-text-muted pb-2 border-b border-border">
              <span>Status</span>
              <span className="text-right w-16">Count</span>
              <span className="text-right w-24">% of present</span>
            </div>

            <div className="divide-y divide-border/60">
              {summary.groups.map((g) => {
                const pct = summary.present > 0
                  ? Math.round((g.count / summary.present) * 100)
                  : 0;
                const isOpen = expanded === g.status;
                return (
                  <div key={g.status}>
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : g.status)}
                      className="w-full grid grid-cols-[1fr_auto_auto] gap-x-4 items-center py-2.5 text-left hover:bg-primary-soft/30 rounded-md px-1 -mx-1"
                    >
                      <span className="flex items-center gap-2 text-sm">
                        <ChevronDown
                          size={14}
                          className={cn('text-text-muted transition-transform', isOpen && 'rotate-180')}
                        />
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: AVAILABILITY_DOT_COLORS[g.status] }}
                        />
                        {g.label}
                      </span>
                      <span className="text-right w-16 font-semibold tabular-nums">{g.count}</span>
                      <span className="text-right w-24 text-text-muted tabular-nums">
                        {g.status === 'offline' ? '—' : `${pct}%`}
                      </span>
                    </button>
                    {isOpen && g.people.length > 0 && <PeopleList people={g.people} />}
                    {isOpen && g.people.length === 0 && (
                      <p className="text-xs text-text-muted py-3 px-1">No one in this status.</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      }}
    </SectionCard>
  );
}
