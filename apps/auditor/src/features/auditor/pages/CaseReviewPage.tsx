import { useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import { Button } from '@vkyc/shared/components/ui/Button';
import { Card } from '@vkyc/shared/components/ui/Card';
import { Modal, ModalFooter } from '@vkyc/shared/components/ui/Modal';
import { StatusPill } from '@vkyc/shared/components/ui/StatusPill';
import { CallRecordingPlayer } from '@vkyc/shared/components/call/CallRecordingPlayer';
import { KycReport } from '@vkyc/shared/components/report/KycReport';
import {
  RejectionReasonPicker,
  hasRejectionSelection,
} from '@vkyc/shared/components/call/RejectionReasonPicker';
import { buildCallLogReportData } from '@vkyc/shared/lib/callLogReport';
import {
  formatRejectionSummary,
  type SelectedRejectionReasons,
} from '@vkyc/shared/lib/rejectionReasons';
import { formatDuration, formatDateLabel, formatTimeLabel } from '@vkyc/shared/lib/format';
import { useSessionStatus } from '@vkyc/shared/features/session/SessionStatusContext';
import {
  getAuditorName,
  getNextPendingCase,
  getPendingCase,
  SEED_AUDITOR,
  submitAuditorDecision,
  useAuditorSession,
  type AuditorReviewDecision,
} from '@vkyc/shared/data/auditorStore';

type ActiveModal = 'approve' | 'recapture' | 'reject' | null;

const EMPTY_REASONS: SelectedRejectionReasons = { selections: [], remarks: '' };

export function CaseReviewPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { status } = useSessionStatus();
  const auditorSession = useAuditorSession();
  const pendingCase = useMemo(
    () => getPendingCase(id),
    [id, auditorSession.version],
  );

  const [modal, setModal] = useState<ActiveModal>(null);
  const [reasons, setReasons] = useState<SelectedRejectionReasons>(EMPTY_REASONS);
  const [approveRemarks, setApproveRemarks] = useState('');
  const startedAtRef = useRef<number>(Date.now());

  useEffect(() => {
    startedAtRef.current = Date.now();
    setModal(null);
    setReasons(EMPTY_REASONS);
    setApproveRemarks('');
  }, [id]);

  if (!pendingCase) {
    return (
      <div className="p-6">
        <Card className="text-center py-16">
          <p className="text-text-muted mb-4">This case is no longer in the pending queue.</p>
          <Button onClick={() => navigate('/cases')}>Back to My Cases</Button>
        </Card>
      </div>
    );
  }

  if (status !== 'online') {
    return <Navigate to="/cases" replace />;
  }

  if (pendingCase.assignment.auditorId !== SEED_AUDITOR.id) {
    return <Navigate to="/cases" replace />;
  }

  const { call, customer, agent, approvedAt, attemptNumber, previousAttempt, assignment, reallocations } = pendingCase;
  const reportData = buildCallLogReportData(call, customer);

  const submit = (decision: AuditorReviewDecision) => {
    const decisionTimeSec = Math.max(1, Math.round((Date.now() - startedAtRef.current) / 1000));
    const isApprove = decision === 'Approved';
    submitAuditorDecision({
      callId: call.id,
      decision,
      reason: isApprove ? null : formatRejectionSummary(reasons) || null,
      remarks: isApprove ? approveRemarks.trim() : reasons.remarks.trim(),
      decisionTimeSec,
    });
    const next = getNextPendingCase(call.id, SEED_AUDITOR.id);
    setModal(null);
    if (next) {
      navigate(`/cases/${next.call.id}`);
    } else {
      navigate('/cases');
    }
  };

  const facts: { label: string; value: string }[] = [
    { label: 'App ID', value: customer.appId },
    { label: 'Partner', value: customer.partnerId },
    { label: 'Product', value: customer.productType },
    { label: 'Agent', value: agent.name },
    { label: 'Call Duration', value: formatDuration(call.durationSec) },
    { label: 'Received', value: `${formatDateLabel(approvedAt)}, ${formatTimeLabel(approvedAt)}` },
    { label: 'Attempt', value: `#${attemptNumber}` },
    { label: 'Language', value: customer.language },
  ];

  const assignmentSourceLabel = assignment.source === 'auto'
    ? 'auto-assignment rule'
    : `admin${assignment.assignedByName ? ` (${assignment.assignedByName})` : ''}`;

  return (
    <div className="p-6 pb-28 space-y-4">
      <button
        type="button"
        onClick={() => navigate('/cases')}
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text"
      >
        <ArrowLeft size={16} /> Back to My Cases
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-text">{customer.name}</h1>
          <p className="text-sm text-text-muted mt-0.5">
            <span className="font-mono">{customer.appId}</span> · Agent-approved, awaiting your review
          </p>
        </div>
        <StatusPill label="In Review" variant="pending" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-4 items-start">
        <div className="space-y-4 lg:sticky lg:top-20">
          <CallRecordingPlayer
            customer={customer}
            agent={agent}
            timestamp={call.answeredAt ?? call.timestamp}
            durationSec={call.durationSec}
          />

          <Card>
            <h3 className="text-sm font-semibold text-text mb-3">Case facts</h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              {facts.map((f) => (
                <div key={f.label}>
                  <dt className="text-xs text-text-muted">{f.label}</dt>
                  <dd className="text-sm text-text font-medium mt-0.5">{f.value}</dd>
                </div>
              ))}
            </dl>
            {previousAttempt && (
              <div className="mt-4 pt-3 border-t border-border">
                <div className="text-xs text-text-muted">Previous attempt</div>
                <div className="text-sm text-text mt-0.5">
                  {formatDateLabel(previousAttempt.date)} — {previousAttempt.decision}
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-3">
          <Card className="space-y-2">
            <h3 className="text-sm font-semibold text-text">Assignment</h3>
            <p className="text-sm text-text-muted">
              Assigned {formatDateLabel(assignment.assignedAt)}, {formatTimeLabel(assignment.assignedAt)}
              {' · by '}{assignmentSourceLabel}
            </p>
            {reallocations.length > 0 && (
              <div className="pt-2 border-t border-border space-y-1.5">
                <p className="text-xs font-medium text-text">Reallocation history</p>
                <ul className="space-y-1 text-xs text-text-muted">
                  {reallocations.map((r) => (
                    <li key={r.id}>
                      {getAuditorName(r.fromAuditorId)} → {getAuditorName(r.toAuditorId)}
                      {' · by '}{r.byAdminName}
                      {' · '}{formatDateLabel(r.at)} {formatTimeLabel(r.at)}
                      {' — '}{r.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          <Card padding={false} className="overflow-hidden">
            <div className="max-h-[calc(100vh-180px)] overflow-y-auto p-5">
              <KycReport data={reportData} showDownload={false} />
            </div>
          </Card>
        </div>
      </div>

      {/* Sticky decision bar */}
      <div className="fixed bottom-0 left-[232px] right-0 z-30 bg-surface border-t border-border px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="text-sm text-text-muted">
            Reviewing <span className="font-medium text-text">{customer.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="destructive" onClick={() => { setReasons(EMPTY_REASONS); setModal('reject'); }}>
              <XCircle size={16} /> Reject
            </Button>
            <Button variant="secondary" onClick={() => { setReasons(EMPTY_REASONS); setModal('recapture'); }}>
              <RefreshCw size={16} /> Recapture
            </Button>
            <Button variant="success" onClick={() => setModal('approve')}>
              <CheckCircle2 size={16} /> Approve
            </Button>
          </div>
        </div>
      </div>

      {/* Approve modal */}
      <Modal
        open={modal === 'approve'}
        onClose={() => setModal(null)}
        title="Approve case"
        footer={
          <ModalFooter
            onCancel={() => setModal(null)}
            onConfirm={() => submit('Approved')}
            confirmLabel="Approve & next"
            confirmVariant="success"
          />
        }
      >
        <p className="text-sm text-text-muted mb-3">
          Confirm this case meets audit standards. It will move to Approved and you'll advance to the next assigned case.
        </p>
        <textarea
          value={approveRemarks}
          onChange={(e) => setApproveRemarks(e.target.value)}
          placeholder="Add remarks (optional)"
          className="w-full px-3 py-2 rounded-lg border border-border text-sm h-20 resize-none"
        />
      </Modal>

      {/* Recapture modal */}
      <Modal
        open={modal === 'recapture'}
        onClose={() => setModal(null)}
        title="Send for recapture"
        size="lg"
        footer={
          <ModalFooter
            onCancel={() => setModal(null)}
            onConfirm={() => submit('Recapture')}
            confirmLabel="Send for recapture"
            confirmVariant="primary"
            loading={!hasRejectionSelection(reasons)}
          />
        }
      >
        <p className="text-sm text-text-muted mb-3">
          Select the capture issues the agent must redo. The customer will be asked to reattempt.
        </p>
        <RejectionReasonPicker selected={reasons} onChange={setReasons} decisionFilter="unable" />
      </Modal>

      {/* Reject modal */}
      <Modal
        open={modal === 'reject'}
        onClose={() => setModal(null)}
        title="Reject case"
        size="lg"
        footer={
          <ModalFooter
            onCancel={() => setModal(null)}
            onConfirm={() => submit('Rejected')}
            confirmLabel="Reject case"
            confirmVariant="destructive"
            loading={!hasRejectionSelection(reasons)}
          />
        }
      >
        <p className="text-sm text-text-muted mb-3">
          Select the adverse findings for this rejection. This decision is final for the attempt.
        </p>
        <RejectionReasonPicker selected={reasons} onChange={setReasons} decisionFilter="rejected" />
      </Modal>
    </div>
  );
}
