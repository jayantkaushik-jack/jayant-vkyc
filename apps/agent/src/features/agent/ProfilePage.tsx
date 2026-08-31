import { Avatar } from '@agent/components/ui/Avatar';
import { Card } from '@agent/components/ui/Card';
import {
  ProfileAccordion,
  ProfileDetailGrid,
  ProfileLeavesList,
  formatWorkPlanSummary,
  managerEmailFromName,
} from '@agent/components/profile/ProfileSections';
import { useAgent } from '@agent/features/agent/AgentContext';

const MOCK_LEAVES = [
  { type: 'Casual Leave', dates: '12 Mar 2026', status: 'Approved' },
  { type: 'Sick Leave', dates: '28 Feb 2026', status: 'Approved' },
  { type: 'Casual Leave', dates: '15 Jan 2026 – 16 Jan 2026', status: 'Approved' },
];

export function ProfilePage() {
  const { agent } = useAgent();
  const managerId = `MGR${agent.employeeId.slice(-4)}`;
  const managerEmail = managerEmailFromName(agent.manager);
  const workPlan = formatWorkPlanSummary(agent.workPlan);

  return (
    <div className="p-6 max-w-[900px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-text-muted text-sm mt-1">Your agent identity and work details</p>
      </div>

      <Card>
        <div className="flex items-center gap-5">
          <Avatar person={{ id: agent.id, name: agent.name }} size="lg" ring="primary" />
          <div>
            <h2 className="text-lg font-semibold">{agent.name}</h2>
            <p className="text-sm text-text-muted">{agent.employeeId}</p>
            <p className="text-sm text-text-muted">{agent.email}</p>
            <p className="text-sm text-text-muted">+91 98765 43210</p>
          </div>
        </div>
      </Card>

      <ProfileAccordion title="Personal Information" defaultOpen>
        <ProfileDetailGrid
          rows={[
            { label: 'Manager Name', value: agent.manager },
            { label: 'Manager ID', value: managerId },
            { label: 'Manager Email', value: managerEmail },
          ]}
        />
      </ProfileAccordion>

      <ProfileAccordion title="Branch Information">
        <ProfileDetailGrid rows={[{ label: 'Branch', value: agent.branch }]} />
      </ProfileAccordion>

      <ProfileAccordion title="Work Plan">
        <ProfileDetailGrid
          rows={[
            { label: 'Working Days', value: workPlan.workingDays },
            { label: 'Office Timings', value: workPlan.officeTimings },
            { label: 'Break Timings', value: workPlan.breakTimings },
          ]}
        />
      </ProfileAccordion>

      <ProfileAccordion title="Skill Set">
        <ProfileDetailGrid
          rows={[
            { label: 'Languages', value: agent.skills.languages.join(', ') },
            { label: 'Product Categories', value: agent.skills.productCategories.join(', ') },
          ]}
        />
      </ProfileAccordion>

      <ProfileAccordion title="Leaves">
        <ProfileLeavesList leaves={MOCK_LEAVES} />
      </ProfileAccordion>
    </div>
  );
}
