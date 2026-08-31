import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { Avatar } from '@vkyc/shared/components/ui/Avatar';
import { Card } from '@vkyc/shared/components/ui/Card';
import { Button } from '@vkyc/shared/components/ui/Button';
import { Modal, ModalFooter } from '@vkyc/shared/components/ui/Modal';
import {
  useSessionRoster,
  upsertSessionAgent,
  upsertSessionAuditor,
  upsertSessionAdmin,
  nextAgentEmployeeId,
  nextAuditorEmployeeId,
  nextAdminEmployeeId,
  getSessionAdmins,
} from '@vkyc/shared/data/sessionStore';
import { useSessionPartnerUsers, addPartnerUser } from '@vkyc/shared/data/partnerUsers';
import {
  getAllPendingForAdmin,
  getOnlineAuditorsForAllocation,
  getReallocations,
  getAuditorName,
  reallocateCase,
  useAuditorSession,
  type PendingCase,
} from '@vkyc/shared/data/auditorStore';
import {
  PARTNERS,
  ADMIN_MODULE_PERMISSIONS,
} from '@vkyc/shared/data/types';
import type {
  Agent,
  Auditor,
  AdminUser,
  AdminRoleTitle,
  AdminAccessLevel,
  AdminModulePermission,
  AutoAnswerOverride,
  PartnerId,
  PartnerUser,
  WorkPlanDay,
} from '@vkyc/shared/data/types';
import { formatDateLabel, formatTimeLabel } from '@vkyc/shared/lib/format';
import { cn } from '@vkyc/shared/lib/cn';

type UserTab = 'agent' | 'auditor' | 'admin' | 'partner';

const LANGUAGES = ['English', 'Hindi', 'Marathi', 'Tamil', 'Telugu', 'Kannada', 'Bengali'];
const PRODUCT_CATEGORIES = ['Credit Card', 'Savings Account', 'Fixed Deposit', 'Personal Loan', 'Home Loan'];
const MANAGERS = ['Rajiv Mehta', 'Sunita Rao', 'Amit Desai', 'Kavita Nair', 'Suresh Iyer'];
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const AGENT_PAGE_SIZE = 25;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

interface Searchable {
  name: string;
  employeeId: string;
  email: string;
}

function matchesSearch<T extends Searchable>(item: T, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  return (
    item.name.toLowerCase().includes(q)
    || item.employeeId.toLowerCase().includes(q)
    || item.email.toLowerCase().includes(q)
  );
}

function permissionSummary(admin: AdminUser): string {
  const moduleLabel = admin.modules.length >= ADMIN_MODULE_PERMISSIONS.length
    ? 'All modules'
    : admin.modules.length === 0
      ? 'No modules'
      : `${admin.modules.length} module${admin.modules.length > 1 ? 's' : ''}`;
  return `${admin.accessLevel} · ${moduleLabel}`;
}

function partnerScopeLabel(scope: 'all' | PartnerId[]): string {
  if (scope === 'all') return 'All partners';
  if (scope.length === 0) return 'No partners';
  return scope.map((id) => PARTNERS.find((p) => p.id === id)?.name ?? id).join(', ');
}

function buildWorkPlan(officeStart: string, officeEnd: string, breakStart: string, breakEnd: string): WorkPlanDay[] {
  return DAYS.map((day) => ({ day, officeStart, officeEnd, breakStart, breakEnd }));
}

// ─── Page ───────────────────────────────────────────────────────────────────

export function UsersPage() {
  const navigate = useNavigate();
  const { agents, auditors, admins } = useSessionRoster();
  const partnerUsers = useSessionPartnerUsers();
  const [tab, setTab] = useState<UserTab>('agent');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [toast, setToast] = useState<string | null>(null);

  const [agentWizard, setAgentWizard] = useState<{ open: boolean; editId: string | null }>({ open: false, editId: null });
  const [auditorWizard, setAuditorWizard] = useState<{ open: boolean; editId: string | null }>({ open: false, editId: null });
  const [adminWizard, setAdminWizard] = useState<{ open: boolean; editId: string | null }>({ open: false, editId: null });
  const [partnerWizard, setPartnerWizard] = useState<{ open: boolean; editUser: PartnerUser | null }>({ open: false, editUser: null });
  const [drawer, setDrawer] = useState<{ type: 'auditor' | 'admin'; id: string } | null>(null);

  useEffect(() => {
    setSearch('');
    setPage(1);
  }, [tab]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  const filteredAgents = useMemo(
    () => agents.filter((a) => matchesSearch(a, search)),
    [agents, search],
  );
  const filteredAuditors = useMemo(
    () => auditors.filter((a) => matchesSearch(a, search)),
    [auditors, search],
  );
  const filteredAdmins = useMemo(
    () => admins.filter((a) => matchesSearch(a, search)),
    [admins, search],
  );
  const filteredPartnerUsers = useMemo(
    () => partnerUsers.filter((u) => matchesPartnerUserSearch(u, search)),
    [partnerUsers, search],
  );

  const agentTotalPages = Math.max(1, Math.ceil(filteredAgents.length / AGENT_PAGE_SIZE));
  const safeAgentPage = Math.min(page, agentTotalPages);
  const pagedAgents = filteredAgents.slice(
    (safeAgentPage - 1) * AGENT_PAGE_SIZE,
    safeAgentPage * AGENT_PAGE_SIZE,
  );

  const totalLabel = tab === 'agent'
    ? `Total Agents: ${agents.length}`
    : tab === 'auditor'
      ? `Total Auditors: ${auditors.length}`
      : tab === 'admin'
        ? `Total Admins: ${admins.length}`
        : `Total Partner Users: ${partnerUsers.length}`;

  const addButton = tab === 'agent'
    ? <Button onClick={() => setAgentWizard({ open: true, editId: null })}>Add Agent</Button>
    : tab === 'auditor'
      ? <Button onClick={() => setAuditorWizard({ open: true, editId: null })}>Add Auditor</Button>
      : tab === 'admin'
        ? <Button onClick={() => setAdminWizard({ open: true, editId: null })}>Add Admin</Button>
        : <Button onClick={() => setPartnerWizard({ open: true, editUser: null })}>Add Partner User</Button>;

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Users</h1>
      </div>

      <div className="flex gap-2">
        {(['agent', 'auditor', 'admin', 'partner'] as UserTab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-sm border capitalize',
              tab === t ? 'bg-primary text-white border-primary' : 'border-border',
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <p className="text-sm font-semibold">{totalLabel}</p>
            <input
              type="search"
              placeholder="Search by name, ID or email…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-72 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          {addButton}
        </div>

        {tab === 'agent' && (
          <UsersTable
            rows={pagedAgents}
            onRowClick={(a) => navigate(`/users/${a.id}`)}
            onEdit={(a) => setAgentWizard({ open: true, editId: a.id })}
            emptyLabel="No agents found."
          />
        )}
        {tab === 'auditor' && (
          <UsersTable
            rows={filteredAuditors}
            onRowClick={(a) => setDrawer({ type: 'auditor', id: a.id })}
            onEdit={(a) => setAuditorWizard({ open: true, editId: a.id })}
            emptyLabel="No auditors found."
          />
        )}
        {tab === 'admin' && (
          <UsersTable
            rows={filteredAdmins}
            onRowClick={(a) => setDrawer({ type: 'admin', id: a.id })}
            onEdit={(a) => setAdminWizard({ open: true, editId: a.id })}
            emptyLabel="No admins found."
            extraColumn={{
              header: 'Access',
              render: (a) => (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-soft text-primary whitespace-nowrap">
                  {permissionSummary(a)}
                </span>
              ),
            }}
          />
        )}
        {tab === 'partner' && (
          <PartnerUsersTable
            rows={filteredPartnerUsers}
            onEdit={(u) => setPartnerWizard({ open: true, editUser: u })}
          />
        )}

        {tab === 'agent' && agentTotalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-text-muted">
              Showing {pagedAgents.length === 0 ? 0 : (safeAgentPage - 1) * AGENT_PAGE_SIZE + 1}
              –{(safeAgentPage - 1) * AGENT_PAGE_SIZE + pagedAgents.length} of {filteredAgents.length}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" disabled={safeAgentPage <= 1} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <span className="text-xs text-text-muted">Page {safeAgentPage} of {agentTotalPages}</span>
              <Button variant="secondary" size="sm" disabled={safeAgentPage >= agentTotalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      <AgentWizardModal
        open={agentWizard.open}
        editAgent={agentWizard.editId ? agents.find((a) => a.id === agentWizard.editId) ?? null : null}
        onClose={() => setAgentWizard({ open: false, editId: null })}
      />
      <AuditorWizardModal
        open={auditorWizard.open}
        editAuditor={auditorWizard.editId ? auditors.find((a) => a.id === auditorWizard.editId) ?? null : null}
        onClose={() => setAuditorWizard({ open: false, editId: null })}
      />
      <AdminWizardModal
        open={adminWizard.open}
        editAdmin={adminWizard.editId ? admins.find((a) => a.id === adminWizard.editId) ?? null : null}
        onClose={() => setAdminWizard({ open: false, editId: null })}
      />

      {drawer?.type === 'auditor' && (
        <AuditorProfileDrawer
          auditor={auditors.find((a) => a.id === drawer.id) ?? null}
          onClose={() => setDrawer(null)}
        />
      )}
      {drawer?.type === 'admin' && (
        <AdminProfileDrawer
          admin={admins.find((a) => a.id === drawer.id) ?? null}
          onClose={() => setDrawer(null)}
        />
      )}

      <PartnerUserModal
        open={partnerWizard.open}
        editUser={partnerWizard.editUser}
        onClose={() => setPartnerWizard({ open: false, editUser: null })}
        onSaved={(email) => setToast(`Invitation email sent to ${email}`)}
      />

      {tab === 'auditor' && (
        <AuditAllocationCard onToast={setToast} />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] px-4 py-3 rounded-lg bg-text text-white text-sm shadow-card">
          {toast}
        </div>
      )}
    </div>
  );
}

function AuditAllocationCard({ onToast }: { onToast: (msg: string) => void }) {
  useAuditorSession();
  const pending = getAllPendingForAdmin();
  const reallocations = getReallocations().slice(0, 12);
  const [reallocTarget, setReallocTarget] = useState<PendingCase | null>(null);

  return (
    <>
      <Card className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Audit Allocation</h3>
          <p className="text-xs text-text-muted mt-0.5">
            Agent-approved cases are auto-assigned to online auditors. Admins can reallocate with a mandatory reason.
          </p>
        </div>

        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-text-muted border-b border-border">
                <th className="py-2 px-1 pr-3">App ID</th>
                <th className="py-2 px-1 pr-3">Customer</th>
                <th className="py-2 px-1 pr-3">Agent</th>
                <th className="py-2 px-1 pr-3">Assigned Auditor</th>
                <th className="py-2 px-1 pr-3">Assigned</th>
                <th className="py-2 px-1 pr-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {pending.map((c) => (
                <tr key={c.call.id} className="border-b border-border/50">
                  <td className="py-2.5 px-1 pr-3 font-mono text-xs">{c.customer.appId}</td>
                  <td className="py-2.5 px-1 pr-3">{c.customer.name}</td>
                  <td className="py-2.5 px-1 pr-3">{c.agent.name}</td>
                  <td className="py-2.5 px-1 pr-3">
                    {getAuditorName(c.assignment.auditorId)}
                    <span className="ml-1 text-[10px] text-text-muted">
                      ({c.assignment.source === 'auto' ? 'auto' : 'admin'})
                    </span>
                  </td>
                  <td className="py-2.5 px-1 pr-3 text-xs text-text-muted whitespace-nowrap">
                    {formatTimeLabel(c.assignment.assignedAt)}
                  </td>
                  <td className="py-2.5 px-1 pr-3 text-right">
                    <Button size="sm" variant="secondary" onClick={() => setReallocTarget(c)}>
                      Reallocate
                    </Button>
                  </td>
                </tr>
              ))}
              {pending.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-text-muted">No pending audit cases.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div>
          <p className="text-xs font-semibold mb-2">Reallocations log</p>
          {reallocations.length === 0 ? (
            <p className="text-xs text-text-muted">No reallocations this session.</p>
          ) : (
            <ul className="space-y-1.5 text-xs text-text-muted max-h-40 overflow-y-auto">
              {reallocations.map((r) => (
                <li key={r.id} className="border-b border-border/40 pb-1.5">
                  <span className="font-mono text-text">{r.caseId}</span>
                  {' · '}
                  {getAuditorName(r.fromAuditorId)} → {getAuditorName(r.toAuditorId)}
                  {' · by '}{r.byAdminName}
                  {' · '}{formatDateLabel(r.at)} {formatTimeLabel(r.at)}
                  {' — '}{r.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      {reallocTarget && (
        <ReallocateModal
          pendingCase={reallocTarget}
          onClose={() => setReallocTarget(null)}
          onDone={(msg) => {
            setReallocTarget(null);
            onToast(msg);
          }}
        />
      )}
    </>
  );
}

function ReallocateModal({
  pendingCase,
  onClose,
  onDone,
}: {
  pendingCase: PendingCase;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const auditors = getOnlineAuditorsForAllocation().filter(
    (a) => a.id !== pendingCase.assignment.auditorId,
  );
  const [toAuditorId, setToAuditorId] = useState(auditors[0]?.id ?? '');
  const [reason, setReason] = useState('');
  const admin = getSessionAdmins()[0];

  const canConfirm = !!toAuditorId && reason.trim().length > 0;

  return (
    <Modal
      open
      onClose={onClose}
      title={`Reallocate — ${pendingCase.customer.appId}`}
      size="md"
      footer={
        <ModalFooter
          onCancel={onClose}
          onConfirm={() => {
            if (!canConfirm || !admin) return;
            const entry = reallocateCase({
              caseId: pendingCase.call.id,
              toAuditorId,
              byAdminId: admin.id,
              byAdminName: admin.name,
              reason: reason.trim(),
            });
            if (entry) {
              onDone(`Case reallocated to ${getAuditorName(toAuditorId)}.`);
            }
          }}
          confirmLabel="Confirm reallocation"
          loading={!canConfirm}
        />
      }
    >
      <div className="space-y-4 text-sm">
        <p className="text-text-muted">
          Currently assigned to <span className="font-medium text-text">{getAuditorName(pendingCase.assignment.auditorId)}</span>.
          Select another online auditor and provide a reason.
        </p>
        <FieldLabel label="Assign to">
          <select
            value={toAuditorId}
            onChange={(e) => setToAuditorId(e.target.value)}
            className={inputClass}
          >
            {auditors.length === 0 && <option value="">No other online auditors</option>}
            {auditors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.openCount} open)
              </option>
            ))}
          </select>
        </FieldLabel>
        <FieldLabel label="Reason (required)">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this case being reallocated?"
            className={cn(inputClass, 'h-24 resize-none')}
          />
        </FieldLabel>
      </div>
    </Modal>
  );
}

function matchesPartnerUserSearch(user: PartnerUser, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.trim().toLowerCase();
  const partner = PARTNERS.find((p) => p.id === user.partnerId)?.name ?? user.partnerId;
  return (
    user.name.toLowerCase().includes(q)
    || user.email.toLowerCase().includes(q)
    || user.phone.toLowerCase().includes(q)
    || partner.toLowerCase().includes(q)
  );
}

function PartnerUsersTable({ rows, onEdit }: { rows: PartnerUser[]; onEdit: (u: PartnerUser) => void }) {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-text-muted border-b border-border">
            <th className="py-2 px-1 pr-3">ID</th>
            <th className="py-2 px-1 pr-3">Name</th>
            <th className="py-2 px-1 pr-3">Email</th>
            <th className="py-2 px-1 pr-3">Phone</th>
            <th className="py-2 px-1 pr-3">Partner</th>
            <th className="py-2 px-1 pr-3 text-right">Edit</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border/50 hover:bg-primary-soft/20">
              <td className="py-2.5 px-1 pr-3 font-mono text-xs text-text-muted whitespace-nowrap">{row.id}</td>
              <td className="py-2.5 px-1 pr-3">
                <div className="flex items-center gap-2">
                  <Avatar person={{ id: row.id, name: row.name }} size="xs" />
                  <span className="font-medium whitespace-nowrap">{row.name}</span>
                </div>
              </td>
              <td className="py-2.5 px-1 pr-3 text-text-muted">{row.email}</td>
              <td className="py-2.5 px-1 pr-3 text-text-muted whitespace-nowrap">{row.phone}</td>
              <td className="py-2.5 px-1 pr-3">
                <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] bg-primary-soft text-primary whitespace-nowrap">
                  {PARTNERS.find((p) => p.id === row.partnerId)?.name ?? row.partnerId}
                </span>
              </td>
              <td className="py-2.5 px-1 pr-3 text-right">
                <button
                  type="button"
                  onClick={() => onEdit(row)}
                  className="p-1.5 rounded-lg text-text-muted hover:bg-primary-soft hover:text-primary transition-colors"
                  aria-label={`Edit ${row.name}`}
                  title="Edit"
                >
                  <Pencil size={14} />
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={6} className="py-8 text-center text-text-muted">No partner users found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function PartnerUserModal({
  open,
  editUser,
  onClose,
  onSaved,
}: {
  open: boolean;
  editUser: PartnerUser | null;
  onClose: () => void;
  onSaved: (email: string) => void;
}) {
  const [partnerId, setPartnerId] = useState<PartnerId>(PARTNERS[0].id);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (!open) return;
    setPartnerId(editUser?.partnerId ?? PARTNERS[0].id);
    setName(editUser?.name ?? '');
    setEmail(editUser?.email ?? '');
    setPhone(editUser?.phone ?? '');
  }, [open, editUser]);

  const handleSave = () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;
    if (!editUser) {
      addPartnerUser({ partnerId, name, email: trimmedEmail, phone });
      onSaved(trimmedEmail);
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editUser ? `Edit Partner User — ${editUser.name}` : 'Add Partner User'}
      size="md"
      footer={<ModalFooter onCancel={onClose} onConfirm={handleSave} confirmLabel={editUser ? 'Save' : 'Save & Send Invite'} />}
    >
      <div className="space-y-4">
        <FieldLabel label="Partner">
          <select value={partnerId} onChange={(e) => setPartnerId(e.target.value as PartnerId)} className={inputClass}>
            {PARTNERS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </FieldLabel>
        <FieldLabel label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Full name" />
        </FieldLabel>
        <FieldLabel label="Email">
          <input value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="ops@partner.com" />
        </FieldLabel>
        <FieldLabel label="Phone">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="+91 98765 43210" />
        </FieldLabel>
        {!editUser && (
          <p className="text-xs text-text-muted">
            An invitation email will be sent so the partner can access their scoped dashboard.
          </p>
        )}
      </div>
    </Modal>
  );
}

// ─── Shared table ───────────────────────────────────────────────────────────

interface UsersTableProps<T extends Searchable & { id: string }> {
  rows: T[];
  onRowClick: (row: T) => void;
  onEdit: (row: T) => void;
  emptyLabel: string;
  extraColumn?: {
    header: string;
    render: (row: T) => React.ReactNode;
  };
}

function UsersTable<T extends Searchable & { id: string }>({
  rows,
  onRowClick,
  onEdit,
  emptyLabel,
  extraColumn,
}: UsersTableProps<T>) {
  return (
    <div className="overflow-x-auto -mx-1">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-text-muted border-b border-border">
            <th className="py-2 px-1 pr-3">ID</th>
            <th className="py-2 px-1 pr-3">Name</th>
            <th className="py-2 px-1 pr-3">Email</th>
            {extraColumn && <th className="py-2 px-1 pr-3">{extraColumn.header}</th>}
            <th className="py-2 px-1 pr-3 text-right">Edit</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className="border-b border-border/50 hover:bg-primary-soft/20 cursor-pointer"
              onClick={() => onRowClick(row)}
            >
              <td className="py-2.5 px-1 pr-3 font-mono text-xs text-text-muted whitespace-nowrap">{row.employeeId}</td>
              <td className="py-2.5 px-1 pr-3">
                <div className="flex items-center gap-2">
                  <Avatar person={{ id: row.id, name: row.name }} size="xs" />
                  <span className="font-medium whitespace-nowrap">{row.name}</span>
                </div>
              </td>
              <td className="py-2.5 px-1 pr-3 text-text-muted">{row.email}</td>
              {extraColumn && <td className="py-2.5 px-1 pr-3">{extraColumn.render(row)}</td>}
              <td className="py-2.5 px-1 pr-3 text-right">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onEdit(row); }}
                  className="p-1.5 rounded-lg text-text-muted hover:bg-primary-soft hover:text-primary transition-colors"
                  aria-label={`Edit ${row.name}`}
                  title="Edit"
                >
                  <Pencil size={14} />
                </button>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={extraColumn ? 5 : 4} className="py-8 text-center text-text-muted">
                {emptyLabel}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─── Small form building blocks ────────────────────────────────────────────

function FieldLabel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="text-text-muted">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputClass = 'w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30';

function ChipMultiSelect({
  options,
  value,
  onChange,
}: {
  options: string[];
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (opt: string) => {
    if (value.includes(opt)) onChange(value.filter((v) => v !== opt));
    else onChange([...value, opt]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => toggle(opt)}
          className={cn(
            'px-2.5 py-1 rounded-full text-xs border transition-colors',
            value.includes(opt) ? 'bg-primary-soft border-primary text-primary' : 'border-border text-text-muted hover:border-primary/40',
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function PartnerCheckboxGrid({
  value,
  onChange,
}: {
  value: PartnerId[];
  onChange: (next: PartnerId[]) => void;
}) {
  const toggle = (id: PartnerId) => {
    if (value.includes(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  };
  return (
    <div className="grid grid-cols-2 gap-2">
      {PARTNERS.map((p) => (
        <label key={p.id} className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={value.includes(p.id)} onChange={() => toggle(p.id)} className="rounded text-primary" />
          {p.name}
        </label>
      ))}
    </div>
  );
}

function YesNoToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-2">
      {[{ label: 'Yes', v: true }, { label: 'No', v: false }].map((opt) => (
        <button
          key={opt.label}
          type="button"
          onClick={() => onChange(opt.v)}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs border transition-colors',
            value === opt.v ? 'bg-primary text-white border-primary' : 'border-border text-text-muted',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function StepTabs({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex gap-2 mb-6">
      {steps.map((label, i) => (
        <span
          key={label}
          className={cn('text-xs px-2 py-1 rounded', i === current ? 'bg-primary text-white' : 'bg-gray-100 text-text-muted')}
        >
          {i + 1}. {label}
        </span>
      ))}
    </div>
  );
}

// ─── Add / Edit Agent wizard ────────────────────────────────────────────────

interface AgentFormState {
  employeeId: string;
  name: string;
  mobile: string;
  email: string;
  manager: string;
  branch: string;
  officeStart: string;
  officeEnd: string;
  breakStart: string;
  breakEnd: string;
  canBeAuditor: boolean;
  languages: string[];
  productCategories: string[];
  partners: PartnerId[];
  autoAnswerOverride: AutoAnswerOverride;
  priorityAssistance: boolean;
}

function emptyAgentForm(): AgentFormState {
  return {
    employeeId: '',
    name: '',
    mobile: '',
    email: '',
    manager: MANAGERS[0],
    branch: 'Mumbai HQ',
    officeStart: '09:00',
    officeEnd: '18:00',
    breakStart: '13:00',
    breakEnd: '14:00',
    canBeAuditor: false,
    languages: ['Hindi', 'English'],
    productCategories: PRODUCT_CATEGORIES.slice(0, 2),
    partners: [],
    autoAnswerOverride: 'inherit',
    priorityAssistance: false,
  };
}

function agentToForm(agent: Agent): AgentFormState {
  const day0 = agent.workPlan[0];
  return {
    employeeId: agent.employeeId,
    name: agent.name,
    mobile: agent.mobile ?? '',
    email: agent.email,
    manager: agent.manager,
    branch: agent.branch,
    officeStart: day0?.officeStart ?? '09:00',
    officeEnd: day0?.officeEnd ?? '18:00',
    breakStart: day0?.breakStart ?? '13:00',
    breakEnd: day0?.breakEnd ?? '14:00',
    canBeAuditor: false,
    languages: agent.skills.languages,
    productCategories: agent.skills.productCategories,
    partners: agent.skills.partners,
    autoAnswerOverride: agent.autoAnswerOverride ?? 'inherit',
    priorityAssistance: false,
  };
}

function AgentWizardModal({
  open,
  editAgent,
  onClose,
}: {
  open: boolean;
  editAgent: Agent | null;
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<AgentFormState>(emptyAgentForm());

  useEffect(() => {
    if (open) {
      setForm(editAgent ? agentToForm(editAgent) : emptyAgentForm());
      setStep(0);
    }
  }, [open, editAgent]);

  const update = <K extends keyof AgentFormState>(key: K, value: AgentFormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleDone = () => {
    const employeeId = form.employeeId.trim() || nextAgentEmployeeId();
    const name = form.name.trim() || `New Agent ${employeeId}`;
    const email = form.email.trim() || `${name.split(' ')[0].toLowerCase()}.${employeeId.toLowerCase()}@cashfree.com`;
    upsertSessionAgent({
      id: editAgent?.id,
      employeeId,
      name,
      email,
      mobile: form.mobile.trim() || undefined,
      dateOfJoining: editAgent?.dateOfJoining ?? todayIso(),
      manager: form.manager.trim() || MANAGERS[0],
      branch: form.branch.trim() || 'Mumbai HQ',
      skills: {
        languages: form.languages,
        partners: form.partners,
        productCategories: form.productCategories,
      },
      workPlan: buildWorkPlan(form.officeStart, form.officeEnd, form.breakStart, form.breakEnd),
      autoAnswerOverride: form.autoAnswerOverride,
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editAgent ? `Edit Agent — ${editAgent.name}` : 'Add Agent'}
      size="lg"
      footer={
        <ModalFooter
          onCancel={step === 0 ? onClose : () => setStep(step - 1)}
          cancelLabel={step === 0 ? 'Cancel' : 'Back'}
          onConfirm={step === 2 ? handleDone : () => setStep(step + 1)}
          confirmLabel={step === 2 ? 'Done' : 'Next'}
        />
      }
    >
      <StepTabs steps={['Profile', 'Schedule', 'Skills']} current={step} />

      {step === 0 && (
        <div className="grid grid-cols-2 gap-4">
          <FieldLabel label="Employee ID">
            <input
              value={form.employeeId}
              onChange={(e) => update('employeeId', e.target.value)}
              placeholder={editAgent ? undefined : 'Auto-generated if left blank'}
              className={inputClass}
            />
          </FieldLabel>
          <FieldLabel label="Full Name">
            <input value={form.name} onChange={(e) => update('name', e.target.value)} className={inputClass} />
          </FieldLabel>
          <FieldLabel label="Mobile">
            <input value={form.mobile} onChange={(e) => update('mobile', e.target.value)} className={inputClass} placeholder="+91 98765 43210" />
          </FieldLabel>
          <FieldLabel label="Email">
            <input value={form.email} onChange={(e) => update('email', e.target.value)} className={inputClass} />
          </FieldLabel>
          <FieldLabel label="Manager">
            <select value={form.manager} onChange={(e) => update('manager', e.target.value)} className={inputClass}>
              {MANAGERS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </FieldLabel>
        </div>
      )}

      {step === 1 && (
        <div className="grid grid-cols-2 gap-4">
          <FieldLabel label="Branch">
            <input value={form.branch} onChange={(e) => update('branch', e.target.value)} className={inputClass} />
          </FieldLabel>
          <FieldLabel label="Can also be an Auditor">
            <YesNoToggle value={form.canBeAuditor} onChange={(v) => update('canBeAuditor', v)} />
          </FieldLabel>
          <FieldLabel label="Office Start">
            <input type="time" value={form.officeStart} onChange={(e) => update('officeStart', e.target.value)} className={inputClass} />
          </FieldLabel>
          <FieldLabel label="Office End">
            <input type="time" value={form.officeEnd} onChange={(e) => update('officeEnd', e.target.value)} className={inputClass} />
          </FieldLabel>
          <FieldLabel label="Break Start">
            <input type="time" value={form.breakStart} onChange={(e) => update('breakStart', e.target.value)} className={inputClass} />
          </FieldLabel>
          <FieldLabel label="Break End">
            <input type="time" value={form.breakEnd} onChange={(e) => update('breakEnd', e.target.value)} className={inputClass} />
          </FieldLabel>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <FieldLabel label="Languages">
            <ChipMultiSelect options={LANGUAGES} value={form.languages} onChange={(v) => update('languages', v)} />
          </FieldLabel>
          <FieldLabel label="Product Categories">
            <ChipMultiSelect options={PRODUCT_CATEGORIES} value={form.productCategories} onChange={(v) => update('productCategories', v)} />
          </FieldLabel>
          <FieldLabel label="Partners">
            <PartnerCheckboxGrid value={form.partners} onChange={(v) => update('partners', v)} />
          </FieldLabel>
          <div className="grid grid-cols-2 gap-4">
            <FieldLabel label="Auto Answer Override">
              <select
                value={form.autoAnswerOverride}
                onChange={(e) => update('autoAnswerOverride', e.target.value as AutoAnswerOverride)}
                className={inputClass}
              >
                <option value="inherit">Inherit (from queue/global)</option>
                <option value="on">On</option>
                <option value="off">Off</option>
              </select>
            </FieldLabel>
            <FieldLabel label="Priority Assistance">
              <YesNoToggle value={form.priorityAssistance} onChange={(v) => update('priorityAssistance', v)} />
            </FieldLabel>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ─── Add / Edit Auditor wizard ──────────────────────────────────────────────

interface AuditorFormState {
  employeeId: string;
  name: string;
  email: string;
  mobile: string;
  manager: string;
  managerId: string;
  vcipAuditTrained: boolean;
  trainingCompletedAt: string;
  languages: string[];
  partnerIds: PartnerId[];
  productCategories: string[];
  dailyAuditCapacity: number;
  officeStart: string;
  officeEnd: string;
  breakStart: string;
  breakEnd: string;
  canTakeAgentCalls: boolean;
}

function emptyAuditorForm(): AuditorFormState {
  return {
    employeeId: '',
    name: '',
    email: '',
    mobile: '',
    manager: MANAGERS[0],
    managerId: 'MGR-01',
    vcipAuditTrained: true,
    trainingCompletedAt: todayIso(),
    languages: ['English'],
    partnerIds: PARTNERS.map((p) => p.id),
    productCategories: PRODUCT_CATEGORIES.slice(0, 3),
    dailyAuditCapacity: 60,
    officeStart: '09:00',
    officeEnd: '18:00',
    breakStart: '13:00',
    breakEnd: '14:00',
    canTakeAgentCalls: false,
  };
}

function auditorToForm(auditor: Auditor): AuditorFormState {
  const day0 = auditor.workPlan?.[0];
  return {
    employeeId: auditor.employeeId,
    name: auditor.name,
    email: auditor.email,
    mobile: auditor.mobile ?? '',
    manager: auditor.manager ?? MANAGERS[0],
    managerId: auditor.managerId ?? 'MGR-01',
    vcipAuditTrained: auditor.vcipAuditTrained ?? true,
    trainingCompletedAt: auditor.trainingCompletedAt ?? todayIso(),
    languages: auditor.languages ?? ['English'],
    partnerIds: auditor.partnerIds ?? PARTNERS.map((p) => p.id),
    productCategories: auditor.productCategories ?? PRODUCT_CATEGORIES.slice(0, 3),
    dailyAuditCapacity: auditor.dailyAuditCapacity ?? 60,
    officeStart: day0?.officeStart ?? '09:00',
    officeEnd: day0?.officeEnd ?? '18:00',
    breakStart: day0?.breakStart ?? '13:00',
    breakEnd: day0?.breakEnd ?? '14:00',
    canTakeAgentCalls: auditor.canTakeAgentCalls ?? false,
  };
}

function AuditorWizardModal({
  open,
  editAuditor,
  onClose,
}: {
  open: boolean;
  editAuditor: Auditor | null;
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<AuditorFormState>(emptyAuditorForm());

  useEffect(() => {
    if (open) {
      setForm(editAuditor ? auditorToForm(editAuditor) : emptyAuditorForm());
      setStep(0);
    }
  }, [open, editAuditor]);

  const update = <K extends keyof AuditorFormState>(key: K, value: AuditorFormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleDone = () => {
    const employeeId = form.employeeId.trim() || nextAuditorEmployeeId();
    const name = form.name.trim() || `New Auditor ${employeeId}`;
    const email = form.email.trim() || `${name.split(' ')[0].toLowerCase()}.${employeeId.toLowerCase()}@cashfree.com`;
    upsertSessionAuditor({
      id: editAuditor?.id,
      employeeId,
      name,
      email,
      mobile: form.mobile.trim() || undefined,
      manager: form.manager.trim() || undefined,
      managerId: form.managerId.trim() || undefined,
      vcipAuditTrained: form.vcipAuditTrained,
      trainingCompletedAt: form.vcipAuditTrained ? form.trainingCompletedAt : undefined,
      languages: form.languages,
      partnerIds: form.partnerIds,
      productCategories: form.productCategories,
      dailyAuditCapacity: form.dailyAuditCapacity,
      workPlan: buildWorkPlan(form.officeStart, form.officeEnd, form.breakStart, form.breakEnd),
      canTakeAgentCalls: form.canTakeAgentCalls,
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editAuditor ? `Edit Auditor — ${editAuditor.name}` : 'Add Auditor'}
      size="lg"
      footer={
        <ModalFooter
          onCancel={step === 0 ? onClose : () => setStep(step - 1)}
          cancelLabel={step === 0 ? 'Cancel' : 'Back'}
          onConfirm={step === 1 ? handleDone : () => setStep(step + 1)}
          confirmLabel={step === 1 ? 'Done' : 'Next'}
        />
      }
    >
      <StepTabs steps={['Profile', 'Audit Scope & Schedule']} current={step} />

      {step === 0 && (
        <div className="grid grid-cols-2 gap-4">
          <FieldLabel label="Employee ID">
            <input
              value={form.employeeId}
              onChange={(e) => update('employeeId', e.target.value)}
              placeholder={editAuditor ? undefined : 'Auto-generated if left blank'}
              className={inputClass}
            />
          </FieldLabel>
          <FieldLabel label="Full Name">
            <input value={form.name} onChange={(e) => update('name', e.target.value)} className={inputClass} />
          </FieldLabel>
          <FieldLabel label="Photo">
            <div className="flex items-center gap-2 px-3 py-2 border border-dashed border-border rounded-lg text-xs text-text-muted">
              Upload placeholder — not wired in demo
            </div>
          </FieldLabel>
          <FieldLabel label="Email">
            <input value={form.email} onChange={(e) => update('email', e.target.value)} className={inputClass} />
          </FieldLabel>
          <FieldLabel label="Mobile">
            <input value={form.mobile} onChange={(e) => update('mobile', e.target.value)} className={inputClass} placeholder="+91 98765 43210" />
          </FieldLabel>
          <FieldLabel label="Reporting Manager">
            <select value={form.manager} onChange={(e) => update('manager', e.target.value)} className={inputClass}>
              {MANAGERS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </FieldLabel>
          <FieldLabel label="Manager Employee ID">
            <input value={form.managerId} onChange={(e) => update('managerId', e.target.value)} className={inputClass} />
          </FieldLabel>
          <FieldLabel label="VCIP Audit Trained">
            <YesNoToggle value={form.vcipAuditTrained} onChange={(v) => update('vcipAuditTrained', v)} />
          </FieldLabel>
          {form.vcipAuditTrained && (
            <FieldLabel label="Training Completed On">
              <input
                type="date"
                value={form.trainingCompletedAt}
                onChange={(e) => update('trainingCompletedAt', e.target.value)}
                className={inputClass}
              />
            </FieldLabel>
          )}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <FieldLabel label="Languages (needed to review recordings)">
            <ChipMultiSelect options={LANGUAGES} value={form.languages} onChange={(v) => update('languages', v)} />
          </FieldLabel>
          <FieldLabel label="Partner Scope">
            <PartnerCheckboxGrid value={form.partnerIds} onChange={(v) => update('partnerIds', v)} />
          </FieldLabel>
          <FieldLabel label="Product Categories">
            <ChipMultiSelect options={PRODUCT_CATEGORIES} value={form.productCategories} onChange={(v) => update('productCategories', v)} />
          </FieldLabel>
          <div className="grid grid-cols-2 gap-4">
            <FieldLabel label="Daily Audit Capacity (cases/day)">
              <input
                type="number"
                min={1}
                value={form.dailyAuditCapacity}
                onChange={(e) => update('dailyAuditCapacity', Number(e.target.value) || 0)}
                className={inputClass}
              />
            </FieldLabel>
            <FieldLabel label="Can Also Take Agent Calls">
              <YesNoToggle value={form.canTakeAgentCalls} onChange={(v) => update('canTakeAgentCalls', v)} />
            </FieldLabel>
            <FieldLabel label="Office Start">
              <input type="time" value={form.officeStart} onChange={(e) => update('officeStart', e.target.value)} className={inputClass} />
            </FieldLabel>
            <FieldLabel label="Office End">
              <input type="time" value={form.officeEnd} onChange={(e) => update('officeEnd', e.target.value)} className={inputClass} />
            </FieldLabel>
            <FieldLabel label="Break Start">
              <input type="time" value={form.breakStart} onChange={(e) => update('breakStart', e.target.value)} className={inputClass} />
            </FieldLabel>
            <FieldLabel label="Break End">
              <input type="time" value={form.breakEnd} onChange={(e) => update('breakEnd', e.target.value)} className={inputClass} />
            </FieldLabel>
          </div>
          <p className="text-xs text-text-muted">Work plan applies Mon–Sun with the timings above.</p>
        </div>
      )}
    </Modal>
  );
}

// ─── Add / Edit Admin wizard ────────────────────────────────────────────────

const ROLE_TITLES: AdminRoleTitle[] = ['Operations Admin', 'Quality Lead', 'Super Admin'];
const COMMON_DEFAULT_MODULES: AdminModulePermission[] = ['Dashboard', 'Customers', 'Productivity', 'Users'];

function defaultModulesForRole(role: AdminRoleTitle): AdminModulePermission[] {
  if (role === 'Super Admin') return [...ADMIN_MODULE_PERMISSIONS];
  return [...COMMON_DEFAULT_MODULES];
}

interface AdminFormState {
  employeeId: string;
  name: string;
  email: string;
  mobile: string;
  roleTitle: AdminRoleTitle;
  accessLevel: AdminAccessLevel;
  modules: AdminModulePermission[];
  partnerScopeAll: boolean;
  partnerIds: PartnerId[];
}

function emptyAdminForm(): AdminFormState {
  return {
    employeeId: '',
    name: '',
    email: '',
    mobile: '',
    roleTitle: 'Operations Admin',
    accessLevel: 'Manage',
    modules: defaultModulesForRole('Operations Admin'),
    partnerScopeAll: true,
    partnerIds: [],
  };
}

function adminToForm(admin: AdminUser): AdminFormState {
  return {
    employeeId: admin.employeeId,
    name: admin.name,
    email: admin.email,
    mobile: admin.mobile ?? '',
    roleTitle: admin.roleTitle,
    accessLevel: admin.accessLevel,
    modules: admin.modules,
    partnerScopeAll: admin.partnerScope === 'all',
    partnerIds: admin.partnerScope === 'all' ? [] : admin.partnerScope,
  };
}

function AdminWizardModal({
  open,
  editAdmin,
  onClose,
}: {
  open: boolean;
  editAdmin: AdminUser | null;
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<AdminFormState>(emptyAdminForm());

  useEffect(() => {
    if (open) {
      setForm(editAdmin ? adminToForm(editAdmin) : emptyAdminForm());
      setStep(0);
    }
  }, [open, editAdmin]);

  const update = <K extends keyof AdminFormState>(key: K, value: AdminFormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleRoleChange = (role: AdminRoleTitle) => {
    setForm((f) => {
      if (role === 'Super Admin') {
        return { ...f, roleTitle: role, accessLevel: 'Manage', modules: [...ADMIN_MODULE_PERMISSIONS] };
      }
      return { ...f, roleTitle: role };
    });
  };

  const toggleModule = (mod: AdminModulePermission) => {
    setForm((f) => ({
      ...f,
      modules: f.modules.includes(mod) ? f.modules.filter((m) => m !== mod) : [...f.modules, mod],
    }));
  };

  const handleDone = () => {
    const employeeId = form.employeeId.trim() || nextAdminEmployeeId();
    const name = form.name.trim() || `New Admin ${employeeId}`;
    const email = form.email.trim() || `${name.split(' ')[0].toLowerCase()}.${employeeId.toLowerCase()}@cashfree.com`;
    upsertSessionAdmin({
      id: editAdmin?.id,
      employeeId,
      name,
      email,
      mobile: form.mobile.trim() || undefined,
      roleTitle: form.roleTitle,
      accessLevel: form.accessLevel,
      modules: form.modules,
      partnerScope: form.partnerScopeAll ? 'all' : form.partnerIds,
    });
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editAdmin ? `Edit Admin — ${editAdmin.name}` : 'Add Admin'}
      size="lg"
      footer={
        <ModalFooter
          onCancel={step === 0 ? onClose : () => setStep(step - 1)}
          cancelLabel={step === 0 ? 'Cancel' : 'Back'}
          onConfirm={step === 1 ? handleDone : () => setStep(step + 1)}
          confirmLabel={step === 1 ? 'Done' : 'Next'}
        />
      }
    >
      <StepTabs steps={['Profile', 'Access & Permissions']} current={step} />

      {step === 0 && (
        <div className="grid grid-cols-2 gap-4">
          <FieldLabel label="Employee ID">
            <input
              value={form.employeeId}
              onChange={(e) => update('employeeId', e.target.value)}
              placeholder={editAdmin ? undefined : 'Auto-generated if left blank'}
              className={inputClass}
            />
          </FieldLabel>
          <FieldLabel label="Full Name">
            <input value={form.name} onChange={(e) => update('name', e.target.value)} className={inputClass} />
          </FieldLabel>
          <FieldLabel label="Email">
            <input value={form.email} onChange={(e) => update('email', e.target.value)} className={inputClass} />
          </FieldLabel>
          <FieldLabel label="Mobile">
            <input value={form.mobile} onChange={(e) => update('mobile', e.target.value)} className={inputClass} placeholder="+91 98765 43210" />
          </FieldLabel>
          <FieldLabel label="Role Title">
            <select value={form.roleTitle} onChange={(e) => handleRoleChange(e.target.value as AdminRoleTitle)} className={inputClass}>
              {ROLE_TITLES.map((r) => <option key={r}>{r}</option>)}
            </select>
          </FieldLabel>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <FieldLabel label="Access Level">
            <div className="flex gap-2">
              {(['View only', 'Manage'] as AdminAccessLevel[]).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => update('accessLevel', level)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs border transition-colors',
                    form.accessLevel === level ? 'bg-primary text-white border-primary' : 'border-border text-text-muted',
                  )}
                >
                  {level}
                </button>
              ))}
            </div>
          </FieldLabel>

          <FieldLabel label="Module Permissions">
            <div className="grid grid-cols-2 gap-2">
              {ADMIN_MODULE_PERMISSIONS.map((mod) => (
                <label key={mod} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.modules.includes(mod)}
                    onChange={() => toggleModule(mod)}
                    className="rounded text-primary"
                  />
                  {mod}
                </label>
              ))}
            </div>
          </FieldLabel>

          <FieldLabel label="Partner Scope">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.partnerScopeAll}
                  onChange={(e) => update('partnerScopeAll', e.target.checked)}
                  className="rounded text-primary"
                />
                All partners
              </label>
              {!form.partnerScopeAll && (
                <PartnerCheckboxGrid value={form.partnerIds} onChange={(v) => update('partnerIds', v)} />
              )}
            </div>
          </FieldLabel>
        </div>
      )}
    </Modal>
  );
}

// ─── Profile drawers ────────────────────────────────────────────────────────

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-2 border-b border-border/50 pb-1.5 last:border-0">
      <span className="text-text-muted">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function AuditorProfileDrawer({ auditor, onClose }: { auditor: Auditor | null; onClose: () => void }) {
  if (!auditor) return null;
  return (
    <Modal open onClose={onClose} title="Auditor Profile" size="md">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Avatar person={{ id: auditor.id, name: auditor.name }} size="md" />
          <div>
            <p className="font-semibold">{auditor.name}</p>
            <p className="text-xs text-text-muted font-mono">{auditor.employeeId}</p>
          </div>
        </div>

        <div className="rounded-lg border border-border overflow-hidden">
          <div className="bg-[#E8F0FE] px-3 py-2 text-sm font-semibold text-[#1A3A6B]">Profile</div>
          <div className="p-3 text-sm space-y-1.5">
            <DetailField label="Email" value={auditor.email} />
            <DetailField label="Mobile" value={auditor.mobile ?? '—'} />
            <DetailField label="Reporting Manager" value={auditor.manager ? `${auditor.manager} (${auditor.managerId ?? '—'})` : '—'} />
            <DetailField label="VCIP Audit Trained" value={auditor.vcipAuditTrained ? `Yes — completed ${auditor.trainingCompletedAt ?? '—'}` : 'No'} />
          </div>
        </div>

        <div className="rounded-lg border border-border overflow-hidden">
          <div className="bg-[#E8F0FE] px-3 py-2 text-sm font-semibold text-[#1A3A6B]">Audit Scope & Schedule</div>
          <div className="p-3 text-sm space-y-1.5">
            <DetailField label="Languages" value={auditor.languages?.join(', ') || '—'} />
            <DetailField label="Partner Scope" value={auditor.partnerIds ? partnerScopeLabel(auditor.partnerIds) : 'All partners'} />
            <DetailField label="Product Categories" value={auditor.productCategories?.join(', ') || '—'} />
            <DetailField label="Daily Audit Capacity" value={auditor.dailyAuditCapacity ? `${auditor.dailyAuditCapacity} cases/day` : '—'} />
            <DetailField
              label="Work Plan"
              value={
                auditor.workPlan?.[0]
                  ? `Mon–Sun · ${auditor.workPlan[0].officeStart}–${auditor.workPlan[0].officeEnd} (break ${auditor.workPlan[0].breakStart}–${auditor.workPlan[0].breakEnd})`
                  : '—'
              }
            />
            <DetailField label="Can Also Take Agent Calls" value={auditor.canTakeAgentCalls ? 'Yes' : 'No'} />
          </div>
        </div>
      </div>
    </Modal>
  );
}

function AdminProfileDrawer({ admin, onClose }: { admin: AdminUser | null; onClose: () => void }) {
  if (!admin) return null;
  return (
    <Modal open onClose={onClose} title="Admin Profile" size="md">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Avatar person={{ id: admin.id, name: admin.name }} size="md" />
          <div>
            <p className="font-semibold">{admin.name}</p>
            <p className="text-xs text-text-muted font-mono">{admin.employeeId}</p>
          </div>
        </div>

        <div className="rounded-lg border border-border overflow-hidden">
          <div className="bg-[#E8F0FE] px-3 py-2 text-sm font-semibold text-[#1A3A6B]">Profile</div>
          <div className="p-3 text-sm space-y-1.5">
            <DetailField label="Email" value={admin.email} />
            <DetailField label="Mobile" value={admin.mobile ?? '—'} />
            <DetailField label="Role Title" value={admin.roleTitle} />
          </div>
        </div>

        <div className="rounded-lg border border-border overflow-hidden">
          <div className="bg-[#E8F0FE] px-3 py-2 text-sm font-semibold text-[#1A3A6B]">Access & Permissions</div>
          <div className="p-3 text-sm space-y-3">
            <DetailField label="Access Level" value={admin.accessLevel} />
            <DetailField label="Partner Scope" value={partnerScopeLabel(admin.partnerScope)} />
            <div>
              <p className="text-text-muted mb-2">Module Permissions</p>
              <div className="grid grid-cols-2 gap-1.5">
                {ADMIN_MODULE_PERMISSIONS.map((mod) => {
                  const granted = admin.modules.includes(mod);
                  return (
                    <span
                      key={mod}
                      className={cn(
                        'inline-flex items-center px-2 py-1 rounded text-xs',
                        granted ? 'bg-success/10 text-success' : 'bg-gray-100 text-text-muted line-through',
                      )}
                    >
                      {mod}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
