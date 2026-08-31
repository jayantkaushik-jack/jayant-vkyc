import { Modal } from '@vkyc/shared/components/ui/Modal';
import { generateActivityLog } from '@vkyc/shared/data/adminSelectors';
import type { ActivityLogRow } from '@vkyc/shared/data/adminSelectors';
import type { Agent, CallRecord, Customer } from '@vkyc/shared/data/types';
import { formatDateLabel, formatTimeLabel } from '@vkyc/shared/lib/format';

interface ActivityLogModalProps {
  open: boolean;
  onClose: () => void;
  call: CallRecord;
  customer: Customer;
  agent: Agent;
}

export function ActivityLogModal({ open, onClose, call, customer, agent }: ActivityLogModalProps) {
  const rows = generateActivityLog(call, customer, agent).slice().sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  return (
    <Modal open={open} onClose={onClose} title="Activity Log" size="lg">
      <div className="overflow-x-auto max-h-[65vh] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-surface z-10">
            <tr className="text-left text-text-muted border-b border-border">
              <th className="pb-2 pr-3">Timestamp</th>
              <th className="pb-2 pr-3">Name</th>
              <th className="pb-2 pr-3">Role</th>
              <th className="pb-2 pr-3">Action</th>
              <th className="pb-2 pr-3">Section</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row: ActivityLogRow, i) => (
              <tr key={i} className="border-b border-border/50">
                <td className="py-2 pr-3 text-xs whitespace-nowrap">
                  {formatDateLabel(row.timestamp)} {formatTimeLabel(row.timestamp)}
                </td>
                <td className="py-2 pr-3">{row.name}</td>
                <td className="py-2 pr-3">{row.role}</td>
                <td className="py-2 pr-3 max-w-[200px]">{row.action}</td>
                <td className="py-2 pr-3">{row.section}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}
