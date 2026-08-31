import { useMemo, useState } from 'react';
import { Button } from '@agent/components/ui/Button';
import { Modal, ModalFooter } from '@agent/components/ui/Modal';
import { KycReport, type KycReportData } from '@agent/components/report/KycReport';
import { RejectionReasonPicker, hasRejectionSelection } from '@agent/components/call/RejectionReasonPicker';
import type { SelectedRejectionReasons } from '@vkyc/shared/lib/rejectionReasons';
import {
  evaluateApprovalGates,
  type ValidationCheck,
} from '@vkyc/shared/lib/thresholds';
import { computeFieldMatch, nameMatchPctFromResult } from '@vkyc/shared/lib/matchUtils';
import { useAdminConfig } from '@vkyc/shared/data';
import { CALL_STEPS } from '@vkyc/shared/lib/constants';
import { useCallFlow } from '@agent/features/agent/call/CallFlowContext';

interface ReportStepProps {
  reportData: KycReportData;
  blocked?: boolean;
}

const CHECK_TO_STEP: Record<string, number> = {
  face_aadhaar: CALL_STEPS.findIndex((s) => s.id === 'aadhaar'),
  face_pan: CALL_STEPS.findIndex((s) => s.id === 'pan'),
  name: CALL_STEPS.findIndex((s) => s.id === 'aadhaar'),
  liveness: CALL_STEPS.findIndex((s) => s.id === 'liveliness'),
  geo: CALL_STEPS.findIndex((s) => s.id === 'location'),
};

export function ReportStep({ reportData, blocked }: ReportStepProps) {
  const flow = useCallFlow();
  const { thresholds } = useAdminConfig();
  const [modalOpen, setModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [gateModalOpen, setGateModalOpen] = useState(false);
  const [approveRemarks, setApproveRemarks] = useState('');
  const [modalType, setModalType] = useState<'rejected' | 'unable'>('rejected');
  const [reasons, setReasons] = useState<SelectedRejectionReasons>({ selections: [], remarks: '' });
  const [failures, setFailures] = useState<ValidationCheck[]>([]);

  const gates = useMemo(() => {
    const nameMatch = computeFieldMatch(
      flow.session.customer.name,
      flow.panOcr.name,
      { fieldLabel: 'NAME', seededPct: 93.52, nameMatchMin: thresholds.nameMatchMin },
    );
    const livenessAllCorrect =
      flow.livenessAnswers.length > 0
        ? flow.livenessAnswers.every((a) => a.result === 'Correct')
        : flow.results.liveliness === true;

    return evaluateApprovalGates({
      faceMatchAadhaar: flow.session.faceMatchAadhaar,
      faceMatchPan: flow.session.faceMatchPan,
      nameMatchPct: nameMatchPctFromResult(nameMatch),
      livenessAllCorrect,
      thresholds,
    });
  }, [flow.session, flow.panOcr.name, flow.livenessAnswers, flow.results.liveliness, thresholds]);

  const openModal = (type: 'rejected' | 'unable') => {
    setModalType(type);
    setReasons({ selections: [], remarks: '' });
    setModalOpen(true);
  };

  const handleApproveClick = () => {
    const failed = gates.filter((g) => !g.passed);
    if (failed.length > 0) {
      setFailures(failed);
      setGateModalOpen(true);
      return;
    }
    setApproveRemarks('');
    setApproveModalOpen(true);
  };

  const handleApproveConfirm = () => {
    const combined = approveRemarks.trim()
      ? `${flow.agentRemarks ? `${flow.agentRemarks}\n` : ''}${approveRemarks}`.trim()
      : flow.agentRemarks;
    flow.setAgentRemarks(combined);
    flow.submitDecision('approved');
    setApproveModalOpen(false);
  };

  const handleModalConfirm = () => {
    if (!hasRejectionSelection(reasons) && !reasons.remarks) return;
    flow.setRejectionReasons(reasons);
    flow.submitDecision(modalType === 'rejected' ? 'rejected' : 'unable', reasons);
    setModalOpen(false);
  };

  const customer = flow.session.customer;

  if (blocked) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-900 text-center">
        End the customer session to continue with the report and decision.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <KycReport
        data={{ ...reportData, agentRemarks: flow.agentRemarks, decision: null }}
        nameMatchMin={thresholds.nameMatchMin}
        faceMatchAadhaarMin={thresholds.faceMatchAadhaarMin}
        faceMatchPanMin={thresholds.faceMatchPanMin}
      />

      <div>
        <label className="block text-sm font-medium mb-1.5">Agent Remarks</label>
        <textarea
          value={flow.agentRemarks}
          onChange={(e) => flow.setAgentRemarks(e.target.value)}
          placeholder="Add any notes about this verification..."
          className="w-full px-3 py-2 rounded-lg border border-border text-sm h-24 resize-none"
        />
      </div>

      <div className="flex gap-3 pt-4">
        <Button variant="destructive" onClick={() => openModal('rejected')}>Reject</Button>
        <Button variant="secondary" onClick={() => openModal('unable')}>Unable to Verify</Button>
        <Button variant="success" onClick={handleApproveClick}>Approve</Button>
      </div>

      <Modal
        open={gateModalOpen}
        onClose={() => setGateModalOpen(false)}
        title="Validation below threshold"
        size="md"
      >
        <p className="text-sm text-text-muted mb-3">
          Approval is blocked until all checks meet their thresholds. Review the failing items below.
        </p>
        <ul className="space-y-2 mb-4">
          {failures.map((f) => (
            <li key={f.id} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm">
              <p className="font-medium text-danger">{f.label}</p>
              <p className="text-xs text-text-muted">
                Value: {f.value} · Required: {f.threshold}
              </p>
            </li>
          ))}
        </ul>
        <div className="flex flex-col gap-2">
          {failures.map((f) => {
            const stepIdx = CHECK_TO_STEP[f.id];
            if (stepIdx == null || stepIdx < 0) return null;
            return (
              <Button
                key={`review-${f.id}`}
                variant="secondary"
                size="sm"
                onClick={() => {
                  setGateModalOpen(false);
                  flow.goToStep(stepIdx);
                }}
              >
                Review {CALL_STEPS[stepIdx].label}
              </Button>
            );
          })}
          <Button
            variant="secondary"
            onClick={() => {
              setGateModalOpen(false);
              openModal('unable');
            }}
          >
            Mark Unable to Verify
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              setGateModalOpen(false);
              openModal('rejected');
            }}
          >
            Reject
          </Button>
        </div>
      </Modal>

      <Modal
        open={approveModalOpen}
        onClose={() => setApproveModalOpen(false)}
        title="Approve this KYC?"
        size="md"
        footer={
          <ModalFooter
            onCancel={() => setApproveModalOpen(false)}
            onConfirm={handleApproveConfirm}
            cancelLabel="Cancel"
            confirmLabel="Confirm Approval"
            confirmVariant="success"
          />
        }
      >
        <p className="text-sm font-medium mb-1">{customer.name}</p>
        <p className="text-xs text-text-muted font-mono mb-4">{customer.appId}</p>
        <p className="text-sm text-text-muted mb-4">
          You are confirming that all verification checks passed. This decision will be recorded and sent for audit review.
        </p>
        <label className="block text-sm text-text-muted mb-1.5">Remarks (optional)</label>
        <textarea
          value={approveRemarks}
          onChange={(e) => setApproveRemarks(e.target.value)}
          placeholder="Add approval remarks..."
          className="w-full px-3 py-2 rounded-lg border border-border text-sm h-20 resize-none"
        />
      </Modal>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalType === 'rejected' ? 'What happened?' : 'Why was verification not completed?'}
        size="lg"
        footer={
          <ModalFooter
            onCancel={() => setModalOpen(false)}
            onConfirm={handleModalConfirm}
            cancelLabel="Go Back"
            confirmLabel="Confirm"
            confirmVariant="destructive"
          />
        }
      >
        <RejectionReasonPicker
          selected={reasons}
          onChange={setReasons}
          decisionFilter={modalType === 'rejected' ? 'rejected' : 'unable'}
        />
      </Modal>
    </div>
  );
}
