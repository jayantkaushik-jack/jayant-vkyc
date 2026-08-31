import { useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Modal } from '@vkyc/shared/components/ui/Modal';
import type { Agent, CallRecord, Customer } from '@vkyc/shared/data/types';
import { formatAddress } from '@vkyc/shared/lib/format';
import { formatSbmCustomerId } from '@vkyc/shared/data';
import { cn } from '@vkyc/shared/lib/cn';

interface CustomerDetailsDrawerProps {
  open: boolean;
  onClose: () => void;
  call: CallRecord;
  customer: Customer;
  agent: Agent;
}

export function CustomerDetailsDrawer({ open, onClose, call, customer, agent }: CustomerDetailsDrawerProps) {
  void call;
  void agent;
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const appType = 'INDIVIDUAL';
  const customerId = useMemo(() => formatSbmCustomerId(customer), [customer]);

  const sections = [
    { key: 'pan', title: 'PAN Details' },
    { key: 'income', title: 'Income & Employment' },
    { key: 'account', title: 'Account' },
    { key: 'allocation', title: 'Call Allocation' },
  ];

  return (
    <Modal open={open} onClose={onClose} title="Customer Details" size="lg">
      <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-1">
        <div className="text-xs border border-border rounded-lg px-3 py-2 bg-gray-50 grid gap-1 md:grid-cols-3">
          <div><span className="text-text-muted">Application Type:</span> {appType}</div>
          <div><span className="text-text-muted">Customer ID:</span> {customerId}</div>
          <div><span className="text-text-muted">Application ID:</span> {customer.appId}</div>
        </div>

        <div className="rounded-lg border border-border overflow-hidden">
          <div className="bg-[#E8F0FE] px-3 py-2 text-sm font-semibold text-[#1A3A6B]">Personal Details</div>
          <div className="p-3 text-sm space-y-1.5">
            <DetailField label="Full Name" value={customer.name} />
            <DetailField label="Date of Birth" value={customer.dob} />
            <DetailField label="Gender" value={customer.gender} />
            <DetailField label="Mobile Number" value={customer.phone} />
            <DetailField label="Email Address" value={customer.email} />
            <DetailField label="Current Address" value={formatAddress(customer.currentAddress)} />
            <DetailField label="Permanent Address" value={formatAddress(customer.permanentAddress)} />
            <DetailField label="Customer Status" value={customer.customerStatus === 'New' ? 'NTB' : 'ETB'} />
            <DetailField label="Product Type" value={customer.productType} />
          </div>
        </div>

        <div className="rounded-lg border border-border overflow-hidden">
          <div className="bg-[#E8F0FE] px-3 py-2 text-sm font-semibold text-[#1A3A6B]">As per Aadhaar</div>
          <div className="p-3 text-sm space-y-1.5">
            <DetailField label="Full Name" value={customer.asPerAadhaar?.name ?? customer.name} />
            <DetailField label="Date of Birth" value={customer.asPerAadhaar?.dob ?? customer.dob} />
            <DetailField label="Gender" value={customer.asPerAadhaar?.gender ?? customer.gender} />
            <DetailField label="Address" value={customer.asPerAadhaar?.address ?? formatAddress(customer.currentAddress)} />
          </div>
        </div>

        {sections.map((s) => {
          const isOpen = !!expanded[s.key];
          return (
            <div key={s.key} className="border border-border rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setExpanded((p) => ({ ...p, [s.key]: !isOpen }))}
                className="w-full px-3 py-2 flex items-center justify-between bg-gray-50 text-sm font-medium"
              >
                <span>{s.title}</span>
                <ChevronDown size={14} className={cn('transition-transform text-text-muted', isOpen && 'rotate-180')} />
              </button>
              {isOpen && (
                <div className="p-3 text-sm">
                  {s.key === 'pan' && (
                    <div className="space-y-1.5">
                      <DetailField label="First Name" value={customer.panDetails?.firstName ?? customer.name.split(' ')[0]} />
                      <DetailField label="Middle Name" value={customer.panDetails?.middleName ?? '—'} />
                      <DetailField label="Last Name" value={customer.panDetails?.lastName ?? customer.name.split(' ').slice(1).join(' ')} />
                      <DetailField label="Printed Name" value={customer.panDetails?.printedName ?? customer.name.toUpperCase()} />
                      <DetailField label="Father's Name" value={customer.panDetails?.fatherName ?? customer.fatherName} />
                      <DetailField label="PAN Number" value={customer.panDetails?.panNumber ?? customer.panNumber} />
                      <DetailField label="Date of Birth" value={customer.panDetails?.dob ?? customer.dob} />
                      <DetailField label="Source" value={customer.panDetails?.source ?? 'NSDL'} />
                      <DetailField label="Verified" value={customer.panDetails?.verified ? 'Yes' : 'No'} />
                    </div>
                  )}

                  {s.key === 'income' && (
                    <div className="space-y-1.5">
                      <DetailField label="Employment Type" value={customer.incomeEmployment?.employmentType ?? 'Salaried'} />
                      <DetailField label="Occupation" value={customer.incomeEmployment?.occupation ?? 'Software Engineer'} />
                      <DetailField label="Organization" value={customer.incomeEmployment?.organization ?? 'Cashfree Payments'} />
                      <DetailField label="Annual Income" value={customer.incomeEmployment ? `INR ${customer.incomeEmployment.annualIncome.toLocaleString('en-IN')}` : 'INR 8,40,000'} />
                      <DetailField label="Monthly Income" value={customer.incomeEmployment ? `INR ${customer.incomeEmployment.monthlyIncome.toLocaleString('en-IN')}` : 'INR 70,000'} />
                    </div>
                  )}

                  {s.key === 'account' && (
                    <div className="space-y-1.5">
                      <DetailField label="Branch" value={customer.accountDetails?.branch ?? 'Mumbai HQ'} />
                      <DetailField label="Account Status" value={customer.accountDetails?.status ?? 'Active'} />
                      <DetailField label="Account Number" value={customer.accountDetails?.accountNumber ?? 'XXXXXXXXXXXX'} />
                    </div>
                  )}

                  {s.key === 'allocation' && (
                    <div className="space-y-1.5">
                      <DetailField label="Applicant Priority" value={customer.callAllocation?.applicantPriority ?? 'Medium'} />
                      <DetailField label="Redirect Link" value={customer.callAllocation?.redirectLink ?? '—'} />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[140px_1fr] gap-2 border-b border-border/50 pb-1 last:border-0">
      <span className="text-text-muted">{label}</span>
      <span>{value}</span>
    </div>
  );
}
