import { Modal } from '../ui/Modal';
import { Avatar } from '../ui/Avatar';
import { StatusPill } from '../ui/StatusPill';
import { KycReport } from '../report/KycReport';
import { buildCallLogReportData } from '../../lib/callLogReport';
import { formatDateLabel, formatTimeLabel } from '../../lib/format';
import type { Auditor, CallRecord, Customer } from '../../data/types';

interface CallLogViewModalProps {
  open: boolean;
  onClose: () => void;
  call: CallRecord | null;
  customer: Customer | null;
  auditor: Auditor | null;
}

export function CallLogViewModal({ open, onClose, call, customer, auditor }: CallLogViewModalProps) {
  if (!call || !customer) return null;

  const reportData = buildCallLogReportData(call, customer);

  return (
    <Modal open={open} onClose={onClose} title={`Call — ${customer.appId}`} size="lg">
      <div className="max-h-[60vh] overflow-y-auto space-y-4">
        <KycReport data={reportData} showDownload={false} />
        {auditor && call.auditorDecision && (
          <div className="border border-border rounded-lg p-4 bg-gray-50/60">
            <h4 className="font-semibold text-sm mb-3">Auditor Review</h4>
            <div className="flex items-start gap-3 mb-3">
              <Avatar person={{ id: auditor.id, name: auditor.name }} size="sm" />
              <div>
                <p className="font-medium text-sm">{auditor.name}</p>
                <p className="text-xs text-text-muted">{auditor.employeeId}</p>
              </div>
              <StatusPill
                label={call.auditorDecision}
                variant={
                  call.auditorDecision === 'Approved' ? 'accepted'
                    : call.auditorDecision === 'Rejected' ? 'rejected'
                    : 'recapture'
                }
              />
            </div>
            {call.auditorReviewedAt && (
              <p className="text-xs text-text-muted mb-2">
                Decision recorded: {formatDateLabel(call.auditorReviewedAt)} at {formatTimeLabel(call.auditorReviewedAt)}
              </p>
            )}
            {call.auditorReason && (
              <p className="text-sm mb-1"><span className="text-text-muted">Reason:</span> {call.auditorReason}</p>
            )}
            {call.auditorRemarks && (
              <p className="text-sm"><span className="text-text-muted">Comments:</span> {call.auditorRemarks}</p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
