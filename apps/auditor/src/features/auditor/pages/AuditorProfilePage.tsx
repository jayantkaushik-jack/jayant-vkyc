import { Avatar } from '@vkyc/shared/components/ui/Avatar';
import { Card } from '@vkyc/shared/components/ui/Card';
import {
  ProfileAccordion,
  ProfileDetailGrid,
  ProfileLeavesList,
  formatWorkPlanSummary,
  managerEmailFromName,
} from '@vkyc/shared/components/profile/ProfileSections';
import { SEED_AUDITOR } from '@vkyc/shared/data/auditorStore';

export function AuditorProfilePage() {
  const auditor = SEED_AUDITOR;
  const managerName = auditor.manager ?? '—';
  const managerId = auditor.managerId ?? '—';
  const managerEmail = auditor.manager ? managerEmailFromName(auditor.manager) : '—';
  const workPlan = formatWorkPlanSummary(auditor.workPlan ?? []);
  const leaves = auditor.leaves ?? [];

  return (
    <div className="p-6 max-w-[900px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Profile</h1>
        <p className="text-text-muted text-sm mt-1">Your auditor identity and work details</p>
      </div>

      <Card>
        <div className="flex items-center gap-5">
          <Avatar person={{ id: auditor.id, name: auditor.name }} size="lg" ring="primary" />
          <div>
            <h2 className="text-lg font-semibold">{auditor.name}</h2>
            <p className="text-sm text-text-muted">{auditor.employeeId}</p>
            <p className="text-sm text-text-muted">{auditor.email}</p>
            <p className="text-sm text-text-muted">{auditor.mobile ?? '—'}</p>
          </div>
        </div>
      </Card>

      <ProfileAccordion title="Personal Information" defaultOpen>
        <ProfileDetailGrid
          rows={[
            { label: 'Manager Name', value: managerName },
            { label: 'Manager ID', value: managerId },
            { label: 'Manager Email', value: managerEmail },
          ]}
        />
      </ProfileAccordion>

      <ProfileAccordion title="Branch Information">
        <ProfileDetailGrid rows={[{ label: 'Branch', value: auditor.branch ?? '—' }]} />
      </ProfileAccordion>

      <ProfileAccordion title="Work Plan">
        <ProfileDetailGrid
          rows={[
            { label: 'Working Days', value: workPlan.workingDays || '—' },
            { label: 'Office Timings', value: workPlan.officeTimings },
            { label: 'Break Timings', value: workPlan.breakTimings },
          ]}
        />
      </ProfileAccordion>

      <ProfileAccordion title="Audit Scope">
        <ProfileDetailGrid
          rows={[
            { label: 'Languages', value: (auditor.languages ?? []).join(', ') || '—' },
            { label: 'Product Categories', value: (auditor.productCategories ?? []).join(', ') || '—' },
            { label: 'Daily Audit Capacity', value: auditor.dailyAuditCapacity != null ? String(auditor.dailyAuditCapacity) : '—' },
          ]}
        />
      </ProfileAccordion>

      <ProfileAccordion title="Leaves">
        {leaves.length > 0 ? (
          <ProfileLeavesList leaves={leaves} />
        ) : (
          <p className="pt-4 text-sm text-text-muted">No leave records.</p>
        )}
      </ProfileAccordion>
    </div>
  );
}
