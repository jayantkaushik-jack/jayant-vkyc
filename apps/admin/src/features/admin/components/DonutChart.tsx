import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card } from '@vkyc/shared/components/ui/Card';

interface DonutSlice {
  name: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  title: string;
  centerLabel: string;
  centerValue: string | number;
  data: DonutSlice[];
}

export function DonutChart({ title, centerLabel, centerValue, data }: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <Card>
      <h3 className="font-semibold text-sm mb-4">{title}</h3>
      <div className="relative h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={55} outerRadius={75} paddingAngle={2}>
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => [v.toLocaleString(), 'Count']} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-xs text-text-muted">{centerLabel}</p>
          <p className="text-lg font-semibold">{typeof centerValue === 'number' ? centerValue.toLocaleString() : centerValue}</p>
          {total > 0 && <p className="text-[10px] text-text-muted">of {total.toLocaleString()}</p>}
        </div>
      </div>
    </Card>
  );
}
