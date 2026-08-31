import { useEffect, useMemo, useRef, useState, Fragment } from 'react';
import { Pencil, Trash2, Info, Upload } from 'lucide-react';
import { EFFICIENCY_CONFIG } from '@vkyc/shared/lib/constants';
import { Card } from '@vkyc/shared/components/ui/Card';
import { InfoTooltip } from '@vkyc/shared/components/ui/InfoTooltip';
import { Button } from '@vkyc/shared/components/ui/Button';
import { InlineToast } from '@vkyc/shared/components/ui/Toast';
import { Modal, ModalFooter } from '@vkyc/shared/components/ui/Modal';
import {
  PARTNERS,
  type PartnerId,
  type Queue,
  type ServiceHoursConfig,
  type VerificationThresholds,
  type VirtualBackgroundConfig,
} from '@vkyc/shared/data/types';
import {
  deleteSessionQueue,
  getSessionAdmins,
  getSessionAgents,
  updateAdminConfig,
  upsertSessionQueue,
  useAdminConfig,
  useSessionQueues,
} from '@vkyc/shared/data/sessionStore';
import { SBM_SAMPLE_VIRTUAL_BACKGROUND } from '@vkyc/shared/lib/thresholds';
import { formatDateLabel, formatTimeLabel } from '@vkyc/shared/lib/format';
import { cn } from '@vkyc/shared/lib/cn';

const SKILL_ROWS = [
  { id: 'language', label: 'Preferred Language', mandatory: true, enabled: true },
  { id: 'product', label: 'Product Category', mandatory: true, enabled: true },
  { id: 'branch', label: 'Branch Location', mandatory: false, enabled: true },
  { id: 'partner', label: 'Partner Name', mandatory: true, enabled: true },
];

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
  'Haryana', 'Himachal Pradesh', 'Jammu & Kashmir', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha',
  'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
  'Uttarakhand', 'West Bengal', 'Delhi', 'Puducherry', 'Chandigarh', 'Ladakh',
];

export function ConfigurePage() {
  const queues = useSessionQueues();
  const config = useAdminConfig();
  const agents = getSessionAgents();

  const [rows, setRows] = useState(SKILL_ROWS);
  const [partnerExpanded] = useState(true);
  const [partners, setPartners] = useState<string[]>(PARTNERS.map((p) => p.name));
  const [toast, setToast] = useState<string | null>(null);
  const [queueModal, setQueueModal] = useState<Queue | 'new' | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Queue | null>(null);

  const [stateInput, setStateInput] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const toggle = (id: string, field: 'mandatory' | 'enabled') => {
    setRows((r) => r.map((row) => (row.id === id ? { ...row, [field]: !row[field] } : row)));
  };

  const addBlockedState = () => {
    const value = stateInput.trim();
    if (!value) return;
    if (config.blockedStates.includes(value)) {
      setStateInput('');
      return;
    }
    updateAdminConfig({ blockedStates: [...config.blockedStates, value] });
    setStateInput('');
  };

  const addBlockedPin = () => {
    const raw = pinInput.trim();
    const single = /^\d{6}$/;
    const range = /^(\d{6})-(\d{6})$/;
    if (single.test(raw) || range.test(raw)) {
      if (!config.blockedPinCodes.includes(raw)) {
        updateAdminConfig({ blockedPinCodes: [...config.blockedPinCodes, raw] });
      }
      setPinInput('');
      setPinError(null);
    } else {
      setPinError('Enter a 6-digit PIN or range like 190001-190099');
    }
  };

  return (
    <div className="p-6 max-w-[1100px] mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Configuration</h1>

      {/* 1. Queue Management */}
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-sm">Queue Configurations</h3>
            <p className="text-xs text-text-muted mt-0.5">{queues.length} Active Queues</p>
          </div>
          <Button onClick={() => setQueueModal('new')}>Add New Queue</Button>
        </div>
        <div className="flex items-start gap-2 px-3 py-2 bg-primary-soft/40 border border-primary/20 rounded-lg text-xs text-text">
          <Info size={14} className="mt-0.5 shrink-0 text-primary" />
          <p>Agents assigned to multiple queues receive calls on a round-robin basis across their queues, subject to availability.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {queues.map((q) => (
            <div key={q.id} className="border border-border rounded-lg p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-sm">{q.name}</p>
                  <p className="text-xs text-text-muted font-mono">{q.id}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" className="p-1.5 rounded hover:bg-primary-soft text-primary" onClick={() => setQueueModal(q)} aria-label="Edit queue">
                    <Pencil size={14} />
                  </button>
                  <button type="button" className="p-1.5 rounded hover:bg-red-50 text-danger" onClick={() => setDeleteConfirm(q)} aria-label="Delete queue">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className="text-xs text-text-muted">
                Partners: {q.partnerIds.map((pid) => PARTNERS.find((p) => p.id === pid)?.name ?? pid).join(', ') || '—'}
              </p>
              <p className="text-xs text-text-muted">Agents Assigned: {q.agentIds.length}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* 2. Routing Rules */}
      <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
        Ensure that skill values entered in the admin dashboard exactly match the values passed in the Customer Onboarding API.
      </div>

      <Card>
        <h3 className="font-semibold text-sm mb-4">Routing Rules — Skill-based Matrix</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-text-muted border-b border-border">
              <th className="pb-2 pr-3">S.No</th>
              <th className="pb-2 pr-3">Skill Set</th>
              <th className="pb-2 pr-3">Mandatory</th>
              <th className="pb-2">Enabled</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <Fragment key={row.id}>
                <tr className="border-b border-border/50">
                  <td className="py-3 pr-3">{i + 1}</td>
                  <td className="py-3 pr-3 font-medium">{row.label}</td>
                  <td className="py-3 pr-3">
                    <Toggle checked={row.mandatory} onChange={() => toggle(row.id, 'mandatory')} />
                  </td>
                  <td className="py-3">
                    <Toggle checked={row.enabled} onChange={() => toggle(row.id, 'enabled')} />
                  </td>
                </tr>
                {row.id === 'partner' && partnerExpanded && row.enabled && (
                  <tr key={`${row.id}-values`}>
                    <td colSpan={4} className="py-3 bg-primary-soft/20">
                      <p className="text-xs font-semibold mb-2">Partner values</p>
                      <div className="flex flex-wrap gap-2">
                        {partners.map((p) => (
                          <span key={p} className="inline-flex items-center gap-1 px-2 py-1 bg-surface border border-border rounded text-xs">
                            {p}
                            <button type="button" className="text-danger" onClick={() => setPartners((ps) => ps.filter((x) => x !== p))}>×</button>
                          </span>
                        ))}
                        <button type="button" className="text-xs text-primary" onClick={() => setPartners((ps) => [...ps, 'New Partner'])}>+ Add value</button>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </Card>

      <Card>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5">
              <p className="font-medium text-sm">Auto Answer</p>
              <span
                className="inline-flex text-text-muted"
                title="In this demo the agent app ships with its own default; live propagation between the deployed apps is out of scope."
              >
                <Info size={13} />
              </span>
            </div>
            <p className="text-xs text-text-muted mt-1">
              When enabled, calls routed to an online agent connect automatically without requiring the agent to accept.
            </p>
            {/* Demo note: agent app keeps its own default; no cross-app live sync. */}
          </div>
          <Toggle checked={config.autoAnswer} onChange={() => updateAdminConfig({ autoAnswer: !config.autoAnswer })} />
        </div>
      </Card>

      {/* 3. Negative Lists */}
      <Card className="space-y-4">
        <div>
          <h3 className="font-semibold text-sm">Negative Location Lists</h3>
          <p className="text-xs text-text-muted mt-1">
            Customers whose live location resolves to a blocked state or PIN code are restricted before agent connection (CUSTOMER_RESTRICTED).
          </p>
        </div>

        <div>
          <p className="text-xs font-medium mb-2">Blocked States</p>
          <div className="flex flex-wrap gap-2 mb-2">
            {config.blockedStates.map((s) => (
              <span key={s} className="inline-flex items-center gap-1 px-2 py-1 bg-surface border border-border rounded-full text-xs">
                {s}
                <button
                  type="button"
                  className="text-danger"
                  onClick={() => updateAdminConfig({ blockedStates: config.blockedStates.filter((x) => x !== s) })}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              list="indian-states"
              value={stateInput}
              onChange={(e) => setStateInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addBlockedState())}
              placeholder="Add state…"
              className="flex-1 px-3 py-1.5 border border-border rounded-lg text-sm"
            />
            <datalist id="indian-states">
              {INDIAN_STATES.map((s) => <option key={s} value={s} />)}
            </datalist>
            <Button variant="secondary" onClick={addBlockedState}>Add</Button>
          </div>
        </div>

        <div>
          <p className="text-xs font-medium mb-2">Blocked PIN Codes</p>
          <div className="flex flex-wrap gap-2 mb-2">
            {config.blockedPinCodes.map((p) => (
              <span key={p} className="inline-flex items-center gap-1 px-2 py-1 bg-surface border border-border rounded-full text-xs font-mono">
                {p}
                <button
                  type="button"
                  className="text-danger"
                  onClick={() => updateAdminConfig({ blockedPinCodes: config.blockedPinCodes.filter((x) => x !== p) })}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={pinInput}
              onChange={(e) => { setPinInput(e.target.value); setPinError(null); }}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addBlockedPin())}
              placeholder="6-digit PIN or range (190001-190099)"
              className="flex-1 px-3 py-1.5 border border-border rounded-lg text-sm font-mono"
            />
            <Button variant="secondary" onClick={addBlockedPin}>Add</Button>
          </div>
          {pinError && <p className="text-xs text-danger mt-1">{pinError}</p>}
        </div>

        <Button onClick={() => showToast('Negative lists saved.')}>Save Negative Lists</Button>
      </Card>

      {/* 4. Verification Thresholds */}
      <VerificationThresholdsCard
        thresholds={config.thresholds}
        onSave={(next) => {
          updateAdminConfig({ thresholds: { ...config.thresholds, ...next } });
          showToast('Verification thresholds saved.');
        }}
      />

      {/* 4b. Service Hours */}
      <ServiceHoursCard
        serviceHours={config.serviceHours}
        onSave={(next) => {
          updateAdminConfig({ serviceHours: next });
          showToast('Service hours saved.');
        }}
      />

      {/* 5. Agent Virtual Background */}
      <VirtualBackgroundCard
        config={config.virtualBackground}
        onChange={(vb) => {
          updateAdminConfig({ virtualBackground: vb });
          showToast('Virtual background updated.');
        }}
      />

      {/* 6. Agent Time Thresholds */}
      <Card className="space-y-5">
        <div>
          <h3 className="font-semibold text-sm">Agent Time Thresholds</h3>
          <p className="text-xs text-text-muted mt-1">
            Agents breaching either threshold are flagged on the Productivity roster and agent-detail attendance.
          </p>
        </div>
        <ThresholdControl
          label="Max total break time / day"
          unit="min"
          value={config.maxBreakMinPerDay}
          min={30}
          max={120}
          step={5}
          onChange={(v) => updateAdminConfig({ maxBreakMinPerDay: v })}
        />
        <ThresholdControl
          label="Min total online time / day"
          unit="h"
          value={config.minOnlineHrsPerDay}
          min={6}
          max={9}
          step={0.5}
          onChange={(v) => updateAdminConfig({ minOnlineHrsPerDay: v })}
        />
      </Card>

      {/* 6b. Alerts & Top Performer */}
      <Card className="space-y-5">
        <div>
          <h3 className="font-semibold text-sm">Alerts &amp; Top Performer</h3>
          <p className="text-xs text-text-muted mt-1">
            Thresholds for the dashboard Alerts panel and the ranking KPI for the Top Performer highlight.
          </p>
        </div>
        <ThresholdControl
          label="High waiting-queue threshold"
          unit="waiting"
          value={config.alerts.maxWaitingQueue}
          min={5}
          max={100}
          step={5}
          onChange={(v) => updateAdminConfig({ alerts: { ...config.alerts, maxWaitingQueue: v } })}
        />
        <ThresholdControl
          label="High auditor-backlog threshold"
          unit="cases"
          value={config.alerts.maxAuditorBacklog}
          min={5}
          max={200}
          step={5}
          onChange={(v) => updateAdminConfig({ alerts: { ...config.alerts, maxAuditorBacklog: v } })}
        />
        <ThresholdControl
          label="No-calls alert interval"
          unit="min"
          value={config.alerts.noCallsIntervalMin}
          min={5}
          max={120}
          step={5}
          onChange={(v) => updateAdminConfig({ alerts: { ...config.alerts, noCallsIntervalMin: v } })}
        />
        <div>
          <label className="text-sm font-medium">Top Performer ranking KPI</label>
          <select
            value={config.topPerformerKpi}
            onChange={(e) => updateAdminConfig({ topPerformerKpi: e.target.value as typeof config.topPerformerKpi })}
            className="mt-1 block px-3 py-2 rounded-lg border border-border text-sm bg-surface"
          >
            <option value="efficiency">Efficiency</option>
            <option value="accuracy">Accuracy</option>
            <option value="csat">CSAT</option>
            <option value="aht">AHT</option>
            <option value="approvalRate">Approval Rate</option>
          </select>
        </div>
      </Card>

      {/* 7. Scoring */}
      <Card>
        <h3 className="font-semibold text-sm mb-3">Scoring — Efficiency Weights (read-only)</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {Object.entries(EFFICIENCY_CONFIG.weights).map(([k, v]) => (
            <div key={k} className="flex justify-between border-b border-border/50 pb-2 capitalize">
              <span className="text-text-muted">{k.replace(/([A-Z])/g, ' $1')}</span>
              <span className="font-semibold">{Math.round(v * 100)}%</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-text-muted mt-3">
          Call time band: {EFFICIENCY_CONFIG.callTimeBandSec.min}–{EFFICIENCY_CONFIG.callTimeBandSec.max}s · Reroute cap: {EFFICIENCY_CONFIG.rerouteCapSec}s
        </p>
      </Card>

      <Button onClick={() => showToast('Configuration saved successfully.')}>Save Configuration</Button>
      {toast && <InlineToast message={toast} />}

      {queueModal && (
        <QueueEditModal
          initial={queueModal === 'new' ? null : queueModal}
          allQueues={queues}
          agents={agents}
          onClose={() => setQueueModal(null)}
          onSave={(payload) => {
            upsertSessionQueue(payload);
            setQueueModal(null);
            showToast(queueModal === 'new' ? 'Queue created.' : 'Queue updated.');
          }}
        />
      )}

      {deleteConfirm && (
        <Modal
          open
          onClose={() => setDeleteConfirm(null)}
          title="Delete queue?"
          size="sm"
          footer={
            <ModalFooter
              onCancel={() => setDeleteConfirm(null)}
              onConfirm={() => {
                deleteSessionQueue(deleteConfirm.id);
                setDeleteConfirm(null);
                showToast('Queue deleted.');
              }}
              confirmLabel="Delete"
            />
          }
        >
          <p className="text-sm">
            Delete <span className="font-semibold">{deleteConfirm.name}</span>? Agents assigned only to this queue will be unassigned from it.
          </p>
        </Modal>
      )}
    </div>
  );
}

const THRESHOLD_TIPS: Record<keyof VerificationThresholds, string> = {
  faceMatchAadhaarMin: 'Enforced on agent Face/Aadhaar steps and Report approval gates.',
  faceMatchPanMin: 'Enforced on agent PAN step and Report approval gates.',
  nameMatchMin: 'Enforced on Aadhaar/PAN name OCR match and Report approval gates.',
  livenessRequireAll: 'When On, agent must complete all liveness challenges before advancing.',
  geoFenceRadiusKm: 'Customer live location must be within this radius of declared address.',
  geoFencePinPrefixEnabled: 'If GPS is weak, fall back to matching the first 3 digits of PIN.',
  ekycValidityBufferMin: 'Aadhaar eKYC XML older than (72h − buffer) blocks the journey.',
  callAnswerWindowSec: 'Unanswered calls are re-routed after this window.',
};

function ServiceHoursCard({
  serviceHours,
  onSave,
}: {
  serviceHours: ServiceHoursConfig;
  onSave: (next: ServiceHoursConfig) => void;
}) {
  const [draft, setDraft] = useState(serviceHours);
  useEffect(() => { setDraft(serviceHours); }, [serviceHours]);

  return (
    <Card className="space-y-5">
      <div>
        <h3 className="font-semibold text-sm flex items-center gap-1.5">
          Service Hours
          <span
            className="inline-flex text-text-muted"
            title="Outside these hours customers see service timings and can book a slot"
          >
            <Info size={14} />
          </span>
        </h3>
        <p className="text-xs text-text-muted mt-1">
          Outside these hours customers see service timings and can book a slot.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border p-3 space-y-2">
          <p className="text-xs font-semibold text-text">Weekdays</p>
          <label className="flex items-center justify-between gap-2 text-sm">
            <span className="text-text-muted">Start</span>
            <input
              type="time"
              value={draft.weekday.start}
              onChange={(e) =>
                setDraft((d) => ({ ...d, weekday: { ...d.weekday, start: e.target.value } }))
              }
              className="rounded border border-border px-2 py-1 text-sm"
            />
          </label>
          <label className="flex items-center justify-between gap-2 text-sm">
            <span className="text-text-muted">End</span>
            <input
              type="time"
              value={draft.weekday.end}
              onChange={(e) =>
                setDraft((d) => ({ ...d, weekday: { ...d.weekday, end: e.target.value } }))
              }
              className="rounded border border-border px-2 py-1 text-sm"
            />
          </label>
        </div>
        <div className="rounded-lg border border-border p-3 space-y-2">
          <p className="text-xs font-semibold text-text">Weekends / Bank holidays</p>
          <label className="flex items-center justify-between gap-2 text-sm">
            <span className="text-text-muted">Start</span>
            <input
              type="time"
              value={draft.weekend_holiday.start}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  weekend_holiday: { ...d.weekend_holiday, start: e.target.value },
                }))
              }
              className="rounded border border-border px-2 py-1 text-sm"
            />
          </label>
          <label className="flex items-center justify-between gap-2 text-sm">
            <span className="text-text-muted">End</span>
            <input
              type="time"
              value={draft.weekend_holiday.end}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  weekend_holiday: { ...d.weekend_holiday, end: e.target.value },
                }))
              }
              className="rounded border border-border px-2 py-1 text-sm"
            />
          </label>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={draft.excludeNationalHolidays}
          onChange={(e) =>
            setDraft((d) => ({ ...d, excludeNationalHolidays: e.target.checked }))
          }
          className="rounded border-border"
        />
        Exclude national holidays
      </label>

      <div className="flex gap-2">
        <Button onClick={() => onSave(draft)}>Save Service Hours</Button>
        <Button variant="secondary" onClick={() => setDraft(serviceHours)}>Reset</Button>
      </div>
    </Card>
  );
}

function VerificationThresholdsCard({
  thresholds,
  onSave,
}: {
  thresholds: VerificationThresholds;
  onSave: (next: VerificationThresholds) => void;
}) {
  const [draft, setDraft] = useState(thresholds);
  useEffect(() => { setDraft(thresholds); }, [thresholds]);

  const bufferHrs = Math.floor(draft.ekycValidityBufferMin / 60);
  const bufferMins = draft.ekycValidityBufferMin % 60;
  const answerMin = Math.round(draft.callAnswerWindowSec / 60);

  const set = <K extends keyof VerificationThresholds>(key: K, value: VerificationThresholds[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  };

  return (
    <Card className="space-y-5">
      <div>
        <h3 className="font-semibold text-sm">Verification Thresholds</h3>
        <p className="text-xs text-text-muted mt-1">
          Single definition point for agent-side gating across the VKYC journey.
        </p>
      </div>

      <ThresholdControl
        label="Face match with Aadhaar (min %)"
        tip={THRESHOLD_TIPS.faceMatchAadhaarMin}
        unit="%"
        value={draft.faceMatchAadhaarMin}
        min={50}
        max={100}
        step={1}
        onChange={(v) => set('faceMatchAadhaarMin', v)}
      />
      <ThresholdControl
        label="Face match with PAN (min %)"
        tip={THRESHOLD_TIPS.faceMatchPanMin}
        unit="%"
        value={draft.faceMatchPanMin}
        min={50}
        max={100}
        step={1}
        onChange={(v) => set('faceMatchPanMin', v)}
      />
      <ThresholdControl
        label="Name match (min %)"
        tip={THRESHOLD_TIPS.nameMatchMin}
        unit="%"
        value={draft.nameMatchMin}
        min={50}
        max={100}
        step={1}
        onChange={(v) => set('nameMatchMin', v)}
      />

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium">Liveness — required correct answers</p>
            <TipIcon tip={THRESHOLD_TIPS.livenessRequireAll} />
          </div>
          <p className="text-xs text-text-muted mt-1">
            {draft.livenessRequireAll ? 'All answers required' : 'Optional / best-effort'}
          </p>
        </div>
        <Toggle checked={draft.livenessRequireAll} onChange={() => set('livenessRequireAll', !draft.livenessRequireAll)} />
      </div>

      <ThresholdControl
        label="Geo-fence radius"
        tip={THRESHOLD_TIPS.geoFenceRadiusKm}
        unit="km"
        value={draft.geoFenceRadiusKm}
        min={5}
        max={200}
        step={5}
        onChange={(v) => set('geoFenceRadiusKm', v)}
      />

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium">Geo-fence PIN-prefix fallback</p>
            <TipIcon tip={THRESHOLD_TIPS.geoFencePinPrefixEnabled} />
          </div>
          <p className="text-xs text-text-muted mt-1">{draft.geoFencePinPrefixEnabled ? 'On' : 'Off'}</p>
        </div>
        <Toggle
          checked={draft.geoFencePinPrefixEnabled}
          onChange={() => set('geoFencePinPrefixEnabled', !draft.geoFencePinPrefixEnabled)}
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium">Aadhaar eKYC validity buffer</p>
            <TipIcon tip={THRESHOLD_TIPS.ekycValidityBufferMin} />
          </div>
          <div className="flex items-center gap-1 text-sm">
            <input
              type="number"
              min={0}
              max={71}
              value={bufferHrs}
              onChange={(e) => {
                const h = Math.min(71, Math.max(0, Number(e.target.value) || 0));
                set('ekycValidityBufferMin', h * 60 + bufferMins);
              }}
              className="w-14 px-2 py-1 border border-border rounded text-sm text-right"
            />
            <span className="text-xs text-text-muted">h</span>
            <input
              type="number"
              min={0}
              max={59}
              value={bufferMins}
              onChange={(e) => {
                const m = Math.min(59, Math.max(0, Number(e.target.value) || 0));
                set('ekycValidityBufferMin', bufferHrs * 60 + m);
              }}
              className="w-14 px-2 py-1 border border-border rounded text-sm text-right"
            />
            <span className="text-xs text-text-muted">m</span>
          </div>
        </div>
        <p className="text-[10px] text-text-muted">Hard expiry is 72h; buffer shortens the usable window (default 71h 50m).</p>
      </div>

      <ThresholdControl
        label="Call answer window (reroute)"
        tip={THRESHOLD_TIPS.callAnswerWindowSec}
        unit="min"
        value={answerMin}
        min={1}
        max={5}
        step={1}
        onChange={(v) => set('callAnswerWindowSec', v * 60)}
      />

      <div className="flex gap-2">
        <Button onClick={() => onSave(draft)}>Save Thresholds</Button>
        <Button variant="secondary" onClick={() => setDraft(thresholds)}>Reset</Button>
      </div>
    </Card>
  );
}

function VirtualBackgroundCard({
  config,
  onChange,
}: {
  config: VirtualBackgroundConfig;
  onChange: (vb: VirtualBackgroundConfig) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(config.activeUrl);
  const [previewLabel, setPreviewLabel] = useState<string | null>(config.label);
  const admin = getSessionAdmins()[0];

  useEffect(() => {
    setPreviewUrl(config.activeUrl);
    setPreviewLabel(config.label);
  }, [config.activeUrl, config.label]);

  const apply = (url: string | null, label: string | null) => {
    const next = {
      activeUrl: url,
      label,
      changedBy: admin?.name ?? 'Admin',
      changedAt: new Date().toISOString(),
    };
    setPreviewUrl(url);
    setPreviewLabel(label);
    onChange(next);
  };

  return (
    <Card className="space-y-4">
      <div>
        <h3 className="font-semibold text-sm">Agent Virtual Background</h3>
        <p className="text-xs text-text-muted mt-1">
          Background shown behind the agent during live VKYC calls.
        </p>
      </div>

      <div className="flex flex-wrap gap-4 items-start">
        <div className="w-56 h-32 rounded-lg border border-border overflow-hidden bg-gray-100 flex items-center justify-center">
          {previewUrl ? (
            <img src={previewUrl} alt={previewLabel ?? 'Virtual background'} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs text-text-muted">No background active</span>
          )}
        </div>
        <div className="space-y-2 flex-1 min-w-[200px]">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const url = URL.createObjectURL(file);
              setPreviewUrl(url);
              setPreviewLabel(file.name);
            }}
          />
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => fileRef.current?.click()}>
              <Upload size={14} /> Upload image
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setPreviewUrl(SBM_SAMPLE_VIRTUAL_BACKGROUND);
                setPreviewLabel('SBM sample');
              }}
            >
              Use SBM sample
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!previewUrl}
              onClick={() => apply(previewUrl, previewLabel)}
            >
              Set active
            </Button>
            <Button variant="secondary" onClick={() => apply(null, null)}>
              Remove
            </Button>
          </div>
          {(config.changedBy || config.changedAt) && (
            <p className="text-xs text-text-muted pt-1">
              Changed by {config.changedBy ?? '—'}
              {config.changedAt
                ? ` at ${formatDateLabel(config.changedAt)}, ${formatTimeLabel(config.changedAt)}`
                : ''}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}

function TipIcon({ tip }: { tip: string }) {
  // Native `title` attributes are unreliable (slow, and often skipped over an
  // inline SVG), so use the shared hover/focus tooltip instead.
  return <InfoTooltip text={tip} />;
}

function ThresholdControl({
  label,
  tip,
  unit,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  tip?: string;
  unit: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium">{label}</p>
          {tip && <TipIcon tip={tip} />}
        </div>
        <div className="flex items-center gap-1">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (!Number.isNaN(n)) onChange(Math.min(max, Math.max(min, n)));
            }}
            className="w-20 px-2 py-1 border border-border rounded text-sm text-right"
          />
          <span className="text-xs text-text-muted">{unit}</span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
      <div className="flex justify-between text-[10px] text-text-muted mt-0.5">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
}

function QueueEditModal({
  initial,
  allQueues,
  agents,
  onClose,
  onSave,
}: {
  initial: Queue | null;
  allQueues: Queue[];
  agents: ReturnType<typeof getSessionAgents>;
  onClose: () => void;
  onSave: (q: Omit<Queue, 'id'> & { id?: string }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [partnerIds, setPartnerIds] = useState<PartnerId[]>(initial?.partnerIds ?? []);
  const [agentIds, setAgentIds] = useState<string[]>(initial?.agentIds ?? []);
  const [agentSearch, setAgentSearch] = useState('');

  const partnerOwner = useMemo(() => {
    const map = new Map<PartnerId, string>();
    for (const q of allQueues) {
      if (initial && q.id === initial.id) continue;
      for (const p of q.partnerIds) map.set(p, q.name);
    }
    return map;
  }, [allQueues, initial]);

  const agentOtherQueues = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const q of allQueues) {
      if (initial && q.id === initial.id) continue;
      for (const aid of q.agentIds) {
        const arr = map.get(aid) ?? [];
        arr.push(q.id);
        map.set(aid, arr);
      }
    }
    return map;
  }, [allQueues, initial]);

  const filteredAgents = agents.filter((a) => {
    if (!agentSearch) return true;
    const q = agentSearch.toLowerCase();
    return a.name.toLowerCase().includes(q) || a.employeeId.toLowerCase().includes(q);
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={initial ? `Edit Queue — ${initial.id}` : 'Add New Queue'}
      size="lg"
      footer={
        <ModalFooter
          onCancel={onClose}
          onConfirm={() => onSave({ id: initial?.id, name, partnerIds, agentIds })}
          confirmLabel="Save"
        />
      }
    >
      <div className="space-y-4 text-sm">
        <label className="block">
          Queue Name
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full mt-1 px-3 py-2 border border-border rounded-lg" />
        </label>

        <div>
          <p className="text-text-muted mb-2">Partners <span className="text-[10px]">(moving a partner here removes it from its current queue)</span></p>
          <div className="grid grid-cols-2 gap-2">
            {PARTNERS.map((p) => {
              const owner = partnerOwner.get(p.id);
              return (
                <label key={p.id} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={partnerIds.includes(p.id)}
                    onChange={(e) => {
                      if (e.target.checked) setPartnerIds((ids) => [...ids, p.id]);
                      else setPartnerIds((ids) => ids.filter((x) => x !== p.id));
                    }}
                  />
                  <span>
                    {p.name}
                    {owner && <span className="block text-[10px] text-warning">currently in {owner}</span>}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-text-muted mb-2">Agents</p>
          <input
            type="search"
            value={agentSearch}
            onChange={(e) => setAgentSearch(e.target.value)}
            placeholder="Search agents…"
            className="w-full mb-2 px-3 py-1.5 border border-border rounded-lg text-sm"
          />
          <div className="max-h-48 overflow-y-auto border border-border rounded-lg divide-y divide-border/60">
            {filteredAgents.map((a) => {
              const others = agentOtherQueues.get(a.id) ?? [];
              return (
                <label key={a.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-primary-soft/30">
                  <input
                    type="checkbox"
                    checked={agentIds.includes(a.id)}
                    onChange={(e) => {
                      if (e.target.checked) setAgentIds((ids) => [...ids, a.id]);
                      else setAgentIds((ids) => ids.filter((x) => x !== a.id));
                    }}
                  />
                  <span className="flex-1">
                    {a.name}
                    <span className="text-xs text-text-muted ml-2 font-mono">{a.employeeId}</span>
                  </span>
                  {others.length > 0 && (
                    <span className="text-[10px] text-text-muted">also in {others.join(', ')}</span>
                  )}
                </label>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={cn(
        'w-10 h-5 rounded-full transition-colors relative shrink-0',
        checked ? 'bg-success' : 'bg-gray-300',
      )}
    >
      <span className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform', checked ? 'left-5' : 'left-0.5')} />
    </button>
  );
}
