import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Avatar } from '@vkyc/shared/components/ui/Avatar';
import { cn } from '@vkyc/shared/lib/cn';
import { PARTNERS } from '@vkyc/shared/data/types';
import { getAgentRoster } from '@vkyc/shared/data/adminSelectors';
import { SectionCard } from '@admin/features/admin/components/SectionCard';
import { usePartnerId } from '@admin/features/admin/PartnerFilterContext';

export function AgentAllocationCard() {
  const [open, setOpen] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const partnerId = usePartnerId();

  const toggle = (
    <div className="flex items-center gap-2">
      {open && (
        <>
          <button
            type="button"
            onClick={() => {
              const all: Record<string, boolean> = {};
              PARTNERS.forEach((p) => { all[p.id] = true; });
              all.UNASSIGNED = true;
              setExpandedGroups(all);
            }}
            className="text-xs text-primary hover:underline"
          >
            Expand all
          </button>
          <span className="text-text-muted text-xs">/</span>
          <button
            type="button"
            onClick={() => setExpandedGroups({})}
            className="text-xs text-primary hover:underline"
          >
            Collapse all
          </button>
        </>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 px-3 py-1 rounded-lg border border-border text-xs text-text-muted hover:bg-primary-soft hover:text-primary transition-colors"
      >
        {open ? 'Collapse' : 'Expand'}
        <ChevronDown size={14} className={cn('transition-transform', open && 'rotate-180')} />
      </button>
    </div>
  );

  return (
    <SectionCard title="Agent Allocation" headerRight={toggle}>
      {() => {
        if (!open) {
          return (
            <p className="text-xs text-text-muted">
              Collapsed — expand to view agent allocation and dedicated / shared split per partner.
            </p>
          );
        }
        const roster = getAgentRoster();
        const groups: Array<{
          partnerId: string;
          partnerName: string;
          agents: typeof roster;
        }> = PARTNERS.filter((p) => !partnerId || p.id === partnerId).map((p) => {
          const agents = roster
            .filter((a) => a.partners.includes(p.id))
            .sort((a, b) => a.name.localeCompare(b.name));
          return {
            partnerId: p.id,
            partnerName: p.name,
            agents,
          };
        });
        const unassigned = roster
          .filter((a) => a.partners.length === 0)
          .sort((a, b) => a.name.localeCompare(b.name));
        if (!partnerId && unassigned.length > 0) {
          groups.push({
            partnerId: 'UNASSIGNED',
            partnerName: 'Unassigned',
            agents: unassigned,
          });
        }
        const anyExpanded = groups.some((g) => !!expandedGroups[g.partnerId]);

        return (
          <div className="space-y-4">
            <table className="w-full text-sm">
              <tbody>
                {anyExpanded && (
                  <tr className="text-left text-text-muted border-b border-border">
                    <th className="pb-2 pr-2">Agent</th>
                    <th className="pb-2 px-2">Partner(s)</th>
                    <th className="pb-2 pl-2">Allocation</th>
                  </tr>
                )}
                {groups.map((group) => {
                  const isExpanded = !!expandedGroups[group.partnerId];
                  const dedicatedCount = group.agents.filter((a) => a.dedicated).length;
                  const sharedCount = group.agents.length - dedicatedCount;
                  return [
                    <tr key={`${group.partnerId}-header`} className="bg-bg/50 border-y border-border">
                      <td colSpan={3} className="py-2 px-2">
                        <button
                          type="button"
                          onClick={() => setExpandedGroups((prev) => ({ ...prev, [group.partnerId]: !isExpanded }))}
                          className="w-full flex items-center justify-between text-left"
                        >
                          <span className="font-semibold text-sm">{group.partnerName}</span>
                          <span className="flex items-center gap-2">
                            <span className="text-xs text-text-muted font-normal">
                              {group.agents.length} agents · {dedicatedCount} dedicated · {sharedCount} shared
                            </span>
                            <ChevronDown size={14} className={cn('transition-transform text-text-muted', isExpanded && 'rotate-180')} />
                          </span>
                        </button>
                      </td>
                    </tr>,
                    ...(isExpanded ? group.agents.map((a) => (
                        <tr key={`${group.partnerId}-${a.id}`} className="border-b border-border/50">
                          <td className="py-2 pr-2">
                            <div className="flex items-center gap-2">
                              <Avatar person={{ id: a.id, name: a.name }} size="xs" />
                              <span className="font-medium">{a.name}</span>
                            </div>
                          </td>
                          <td className="py-2 px-2 text-xs text-text-muted">
                            {a.partners.join(', ')}
                          </td>
                          <td className="py-2 pl-2">
                            <span
                              title={!a.dedicated ? `Also serves: ${a.partners.filter((pid) => pid !== group.partnerId).join(', ')}` : 'Dedicated to one partner'}
                              className={cn(
                                'inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full',
                                a.dedicated ? 'bg-success/15 text-success' : 'bg-primary-soft text-primary',
                              )}
                            >
                              {a.dedicated ? 'Dedicated' : 'Shared'}
                            </span>
                          </td>
                        </tr>
                    )) : []),
                  ];
                })}
              </tbody>
            </table>
          </div>
        );
      }}
    </SectionCard>
  );
}
