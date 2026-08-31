import { Card } from '@vkyc/shared/components/ui/Card';

interface OverviewCardProps {
  title: string;
  metrics: { label: string; value: number; sub?: string }[];
}

export function OverviewCard({ title, metrics }: OverviewCardProps) {
  return (
    <Card>
      <h3 className="font-semibold text-sm mb-4">{title}</h3>
      <div className="grid grid-cols-2 gap-4">
        {metrics.map(({ label, value, sub }) => (
          <div key={label}>
            <p className="text-xs text-text-muted mb-1">{label}</p>
            <p className="text-2xl font-semibold">{value}</p>
            {sub && <p className="text-xs text-text-muted mt-1">{sub}</p>}
          </div>
        ))}
      </div>
    </Card>
  );
}
