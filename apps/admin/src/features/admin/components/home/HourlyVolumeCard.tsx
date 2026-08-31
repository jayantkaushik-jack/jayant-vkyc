import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  getHourlyVolumeByPartner,
  PARTNER_COLORS,
} from '@vkyc/shared/data/adminSelectors';
import { getDateRangeFromPreset } from '@vkyc/shared/data';
import { PARTNERS, type PartnerId } from '@vkyc/shared/data/types';
import { cn } from '@vkyc/shared/lib/cn';
import { SectionCard } from '@admin/features/admin/components/SectionCard';
import { usePartnerId } from '@admin/features/admin/PartnerFilterContext';

const PRESETS = [
  ['today', 'Today'],
  ['7d', '7 days'],
  ['30d', '30 days'],
] as const;
type Preset = 'today' | '7d' | '30d';

export function HourlyVolumeCard() {
  const partnerId = usePartnerId();
  const [preset, setPreset] = useState<Preset>('today');
  const [allSelected, setAllSelected] = useState(true);
  const [selected, setSelected] = useState<PartnerId[]>([]);

  const togglePartner = (id: PartnerId) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  };
  const toggleAll = () => {
    if (allSelected && selected.length === 0) return;
    setAllSelected((v) => !v);
  };

  const globalScoped = partnerId != null;
  const range = getDateRangeFromPreset(preset);
  const partnerIds = globalScoped ? [partnerId] : selected.length > 0 ? selected : undefined;
  const data = getHourlyVolumeByPartner({ range, partnerIds, averagePerDay: false });
  const total = Math.round(data.reduce((s, r) => s + r.ALL, 0));

  const presetBtns = (
    <div className="flex gap-1">
      {PRESETS.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => setPreset(v)}
          className={cn(
            'px-2 py-1 rounded-lg text-xs border transition-colors',
            preset === v ? 'bg-primary text-white border-primary' : 'border-border text-text-muted',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );

  const chips = globalScoped ? null : (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        onClick={toggleAll}
        className={cn(
          'px-2.5 py-1 rounded-full text-xs border transition-colors',
          allSelected ? 'bg-primary text-white border-primary' : 'border-border text-text-muted',
        )}
      >
        All
      </button>
      {PARTNERS.map((p) => {
        const on = selected.includes(p.id);
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => togglePartner(p.id)}
            className={cn(
              'px-2.5 py-1 rounded-full text-xs border transition-colors',
              on ? 'text-white border-transparent' : 'border-border text-text-muted',
            )}
            style={on ? { backgroundColor: PARTNER_COLORS[p.id] } : undefined}
          >
            {p.name}
          </button>
        );
      })}
    </div>
  );

  const headerRight = (
    <div className="flex flex-wrap items-center gap-3 justify-end">
      {chips}
      {presetBtns}
    </div>
  );

  return (
    <SectionCard
      title="Hourly Call Volume"
      headerRight={headerRight}
      className="h-full flex flex-col"
      bodyClassName="flex-1"
    >
      {() => {
        const hasPartnerLines = !globalScoped && selected.length > 0;
        const showAll = !globalScoped && (allSelected || !hasPartnerLines);
        return (
          <div className="h-full flex flex-col">
            <p className="text-xs text-text-muted mb-2">
              Total:{' '}
              <span className="font-semibold text-text">{total.toLocaleString()}</span> calls
              {globalScoped ? ' (selected partner)' : ''}
            </p>
            <div className="flex-1">
              <ResponsiveContainer width="100%" height="100%" minHeight={260}>
                <LineChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EBE8F2" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {globalScoped ? (
                    <Line
                      type="monotone"
                      dataKey={partnerId}
                      name={PARTNERS.find((p) => p.id === partnerId)?.name ?? 'Partner'}
                      stroke={PARTNER_COLORS[partnerId]}
                      strokeWidth={3}
                      dot={false}
                    />
                  ) : (
                    <>
                      {showAll && (
                        <Line type="monotone" dataKey="ALL" name="All" stroke="#6434D6" strokeWidth={3} dot={false} />
                      )}
                      {PARTNERS.filter((p) => selected.includes(p.id)).map((p) => (
                        <Line
                          key={p.id}
                          type="monotone"
                          dataKey={p.id}
                          name={p.name}
                          stroke={PARTNER_COLORS[p.id]}
                          strokeWidth={2}
                          dot={false}
                        />
                      ))}
                    </>
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      }}
    </SectionCard>
  );
}
