import { useParams, Link } from 'react-router-dom';
import { calls, getDateRangeFromPreset, getAgentStats } from '@vkyc/shared/data';
import { useSessionRoster } from '@vkyc/shared/data/sessionStore';
import { Avatar } from '@vkyc/shared/components/ui/Avatar';
import { Card } from '@vkyc/shared/components/ui/Card';
import { DonutChart } from '@admin/features/admin/components/DonutChart';

export function AgentProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { agents } = useSessionRoster();
  const agent = agents.find((a) => a.id === id);
  const range = getDateRangeFromPreset('30d');
  const stats = agent ? getAgentStats(calls, agent.id, range) : null;

  if (!agent) {
    return (
      <div className="p-6">
        <p>Agent not found.</p>
        <Link to="/users" className="text-primary text-sm">← Back to Users</Link>
      </div>
    );
  }

  const sections = [
    {
      title: 'Personal Information',
      rows: [
        ['Employee ID', agent.employeeId],
        ['Manager', agent.manager],
        ['Email', agent.email],
      ],
    },
    {
      title: 'Call Support',
      rows: [['Call Type', 'Video KYC'], ['Schedule', 'Fixed Shift']],
    },
    {
      title: 'Branch Information',
      rows: [['Branch', agent.branch], ['Region', 'West']],
    },
    {
      title: 'Work Plan',
      rows: [
        ['Working Days', 'Mon – Sat'],
        ['Office Timings', '09:00 – 18:00'],
        ['Break', '13:00 – 14:00'],
      ],
    },
    {
      title: 'Agent Skill Set',
      rows: [
        ['Languages', agent.skills.languages.join(', ')],
        ['Product Categories', agent.skills.productCategories.join(', ')],
        ['Partners', agent.skills.partners.join(', ')],
      ],
    },
    {
      title: 'Leaves',
      rows: [['Annual Leave Balance', '12 days'], ['Sick Leave', '6 days']],
    },
  ];

  return (
    <div className="p-6 max-w-[1200px] mx-auto space-y-6">
      <Link to="/users" className="text-sm text-primary hover:underline">← Users</Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <div className="flex flex-col items-center text-center mb-6">
            <Avatar person={{ id: agent.id, name: agent.name }} size="lg" className="mb-3" />
            <h2 className="text-xl font-semibold">{agent.name}</h2>
            <p className="text-sm text-text-muted">{agent.employeeId}</p>
          </div>
          <label className="flex items-center justify-between text-sm mb-4 pb-4 border-b border-border">
            <span>Priority Assistance</span>
            <input type="checkbox" className="rounded text-primary" />
          </label>
          <div className="space-y-2 text-sm">
            <p><span className="text-text-muted">Phone:</span> +91 98765 43210</p>
            <p><span className="text-text-muted">Email:</span> {agent.email}</p>
            <p><span className="text-text-muted">Active since:</span> Jan 2024</p>
          </div>
        </Card>

        <div className="lg:col-span-1 space-y-3">
          {sections.map(({ title, rows }) => (
            <details key={title} className="border border-border rounded-lg bg-surface" open={title === 'Personal Information'}>
              <summary className="px-4 py-3 font-semibold text-sm cursor-pointer">{title}</summary>
              <div className="px-4 pb-4 space-y-2 text-sm">
                {rows.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4">
                    <span className="text-text-muted">{k}</span>
                    <span className="text-right">{v}</span>
                  </div>
                ))}
              </div>
            </details>
          ))}
        </div>

        <div>
          {stats && (
            <>
              <DonutChart
                title="Daily Activity"
                centerLabel="Total Calls"
                centerValue={stats.callsTaken}
                data={[
                  { name: 'Approved', value: stats.approved, color: '#6434D6' },
                  { name: 'Rejected', value: stats.rejected, color: '#E5484D' },
                  { name: 'Failed', value: stats.failed, color: '#F5A623' },
                ]}
              />
              <Card className="mt-4">
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div><p className="text-text-muted text-xs">Approved</p><p className="font-semibold text-success">{stats.approved}</p></div>
                  <div><p className="text-text-muted text-xs">Rejected</p><p className="font-semibold text-danger">{stats.rejected}</p></div>
                  <div><p className="text-text-muted text-xs">Failed</p><p className="font-semibold text-warning">{stats.failed}</p></div>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
