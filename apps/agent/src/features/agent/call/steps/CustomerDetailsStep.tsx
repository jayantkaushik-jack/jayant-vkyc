import { useState } from 'react';
import { DimensionList, RiskSnapshotModal } from '@agent/components/risk/RiskSnapshotModal';
import type { Customer } from '@vkyc/shared/data/types';
import type { PreCheckState } from '@agent/features/agent/call/CallFlowContext';
import { getInitials } from '@vkyc/shared/lib/avatar';
import type { AmberPersona, Dimension, RiskDimensions } from '@agent/features/agent/call/amber/personas';

interface CustomerDetailsStepProps {
  customer: Customer;
  persona: AmberPersona;
  onProceed: (checks: PreCheckState) => void;
}

type CheckKey = 'videoVisible' | 'audible';
type CheckValue = 'yes' | 'no' | null;

/**
 * Display-only masking for the Customer Details panel — the underlying
 * synthetic data is untouched (other steps, like the liveness Q&A, still
 * use the real generated values), but anything realistic-looking enough to
 * be mistaken for a real customer's details on a shared screen gets an
 * obviously-dummy pattern here.
 */
function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '').slice(-10);
  if (digits.length < 10) return 'XXXXXXXXXX';
  return `${digits.slice(0, 2)}XXXXXX${digits.slice(8)}`;
}

const MASKED_EMAIL = 'applicant_demo@example.com';

function maskAddressLine(addr: { city: string; state: string; pincode: string }): string {
  return `House No. XX, Sample Road, ${addr.city}, ${addr.state} - ${addr.pincode}`;
}

const CHEVRON = (
  <svg className="chev" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 6l6 6-6 6" />
  </svg>
);

/**
 * Round 31 — restyled onto `.card`/`.check-row`/`.seg`/`.sig`/`.group`/`.kv`
 * (design system §"pre-call dossier", reference screen 07). The two-column
 * call-room geometry (video rail + this work panel) is owned by
 * `CallRoomPage.tsx`/`VideoPanel.tsx`, both out of this round's scope — only
 * this step's own content is restyled here. `.actionbar` replaces the old
 * inline Proceed button so the primary action never scrolls below the fold,
 * per the design system's own rationale for that component.
 */
export function CustomerDetailsStep({ customer, persona, onProceed }: CustomerDetailsStepProps) {
  const [checks, setChecks] = useState<Record<CheckKey, CheckValue>>({
    videoVisible: null,
    audible: null,
  });
  const [snapshotOpen, setSnapshotOpen] = useState(false);

  const setCheck = (key: CheckKey, value: 'yes' | 'no') => {
    setChecks((prev) => ({ ...prev, [key]: value }));
  };

  const allYes = checks.videoVisible === 'yes' && checks.audible === 'yes';
  const hasNo = checks.videoVisible === 'no' || checks.audible === 'no';
  const doneCount = (checks.videoVisible !== null ? 1 : 0) + (checks.audible !== null ? 1 : 0);
  const checkChipText = allYes ? 'Ready' : `${2 - doneCount} to confirm`;
  const checkChipClass = allYes ? 'chip--ok' : hasNo ? 'chip--da' : 'chip--brand';

  const dimEntries = Object.entries(persona.riskSnapshot.dimensions) as [keyof RiskDimensions, Dimension][];
  const flagged = dimEntries.filter(([, d]) => d.level === 'MEDIUM' || d.level === 'HIGH');
  const clear = dimEntries.filter(([, d]) => d.level === 'LOW' || d.level === 'NOT_AVAILABLE');
  const sigDotClass = flagged.some(([, d]) => d.level === 'HIGH') ? 'dim-dot--high' : flagged.length > 0 ? 'dim-dot--med' : 'dim-dot--low';

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto p-5" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s-4)' }}>

        <section className="card card--pad" aria-labelledby="checkHead">
          <div className="row gap-2" style={{ marginBottom: 'var(--s-1)' }}>
            <h2 className="t-h2" id="checkHead">Before you start</h2>
            <span className={`chip ${checkChipClass}`}>{checkChipText}</span>
          </div>
          <p className="t-small c-muted" style={{ marginBottom: 'var(--s-2)' }}>
            Confirm the connection is good enough to run KYC. Both must be yes.
          </p>

          <div className="check-row">
            <div className="grow">
              <div className="t-body-str">Can you see the applicant clearly?</div>
              <div className="t-small c-muted">Face fully in frame, adequate light</div>
            </div>
            <div className="seg" role="group" aria-label="Video visible">
              <button type="button" className="seg__btn" data-val="yes" aria-pressed={checks.videoVisible === 'yes'} onClick={() => setCheck('videoVisible', 'yes')}>Yes</button>
              <button type="button" className="seg__btn" data-val="no" aria-pressed={checks.videoVisible === 'no'} onClick={() => setCheck('videoVisible', 'no')}>No</button>
            </div>
          </div>

          <div className="check-row">
            <div className="grow">
              <div className="t-body-str">Can you hear the applicant clearly?</div>
              <div className="t-small c-muted">Needed for the spoken answers later</div>
            </div>
            <div className="seg" role="group" aria-label="Audio clear">
              <button type="button" className="seg__btn" data-val="yes" aria-pressed={checks.audible === 'yes'} onClick={() => setCheck('audible', 'yes')}>Yes</button>
              <button type="button" className="seg__btn" data-val="no" aria-pressed={checks.audible === 'no'} onClick={() => setCheck('audible', 'no')}>No</button>
            </div>
          </div>

          {hasNo && (
            <div className="card card--warn card--pad" style={{ marginTop: 'var(--s-3)', padding: 'var(--s-3) var(--s-4)' }}>
              <p className="t-small">
                <span className="t-body-str">Ask the applicant to move to better light or reconnect.</span>{' '}
                If it still fails, end the session and report the issue so the case routes to review with no penalty to the applicant.
              </p>
            </div>
          )}
        </section>

        <section className="card card--pad" aria-labelledby="sigHead">
          <div className="row gap-2" style={{ marginBottom: 'var(--s-3)' }}>
            <span className={`dim-dot ${sigDotClass}`} aria-hidden="true" />
            <h2 className="t-body-str" id="sigHead">{flagged.length} signal{flagged.length === 1 ? '' : 's'} to resolve</h2>
            <button type="button" className="link-btn t-small" style={{ marginLeft: 'auto', fontWeight: 500 }} onClick={() => setSnapshotOpen(true)}>
              Full risk snapshot
            </button>
          </div>

          {flagged.length > 0 && <DimensionList dimensions={Object.fromEntries(flagged)} />}

          {clear.length > 0 && (
            <details className="disclosure" style={{ marginTop: 'var(--s-3)' }}>
              <summary>
                {CHEVRON}
                <span className="dim-dot dim-dot--low" aria-hidden="true" />
                {clear.length} signal{clear.length === 1 ? '' : 's'} clear
              </summary>
              <div className="disclosure__body">
                <DimensionList dimensions={Object.fromEntries(clear)} />
              </div>
            </details>
          )}
        </section>

        <section className="card card--pad" aria-labelledby="dossierHead">
          <div className="row gap-3" style={{ marginBottom: 'var(--s-3)', paddingBottom: 'var(--s-3)', borderBottom: '1px solid var(--n-100)' }}>
            <span className="avatar avatar--md" aria-hidden="true">{getInitials(customer.name)}</span>
            <div className="grow">
              <p className="t-body-str" id="dossierHead">{customer.name}</p>
              <p className="t-small c-muted">{customer.customerStatus} applicant &middot; {customer.productType}</p>
            </div>
            <span className="chip chip--neutral">Language: {customer.language}</span>
          </div>

          <details className="group" open>
            <summary>
              {CHEVRON}
              <span className="group__dot" style={{ background: 'var(--cf-brand)' }} aria-hidden="true" />
              Identity
            </summary>
            <div style={{ paddingBottom: 'var(--s-2)' }}>
              <div className="kv"><span className="kv__k">Gender</span><span className="kv__v">{customer.gender}</span></div>
              <div className="kv"><span className="kv__k">Date of birth</span><span className="kv__v t-mono">{customer.dob}</span></div>
              <div className="kv"><span className="kv__k">Father&rsquo;s name</span><span className="kv__v">{customer.fatherName}</span></div>
              <div className="kv"><span className="kv__k">Mobile</span><span className="kv__v t-mono">{maskPhone(customer.phone)}</span></div>
            </div>
          </details>

          <details className="group">
            <summary>
              {CHEVRON}
              <span className="group__dot" style={{ background: 'var(--cf-gold)' }} aria-hidden="true" />
              Contact &amp; address
            </summary>
            <div style={{ paddingBottom: 'var(--s-2)' }}>
              <div className="kv"><span className="kv__k">Email</span><span className="kv__v">{MASKED_EMAIL}</span></div>
              <div className="kv"><span className="kv__k">Current address</span><span className="kv__v">{maskAddressLine(customer.currentAddress)}</span></div>
              <div className="kv"><span className="kv__k">Permanent address</span><span className="kv__v">{maskAddressLine(customer.permanentAddress)}</span></div>
            </div>
          </details>

          <details className="group">
            <summary>
              {CHEVRON}
              <span className="group__dot" style={{ background: 'var(--n-400)' }} aria-hidden="true" />
              Account
            </summary>
            <div style={{ paddingBottom: 'var(--s-2)' }}>
              <div className="kv"><span className="kv__k">Product type</span><span className="kv__v t-mono">{customer.productType}</span></div>
              <div className="kv"><span className="kv__k">Onboarding channel</span><span className="kv__v">{persona.onboardingChannel}</span></div>
              {persona.onboardingChannel === 'Assisted — BC Agent' && persona.bcSourcingCode && (
                <div className="kv"><span className="kv__k">BC sourcing code</span><span className="kv__v t-mono">{persona.bcSourcingCode}</span></div>
              )}
              <div className="kv"><span className="kv__k">Customer status</span><span className="kv__v">{customer.customerStatus}</span></div>
            </div>
          </details>
        </section>

      </div>

      <div className="actionbar">
        <span className="t-small c-faint grow">
          Illustrative data only — no real customer information is used in this demo.
        </span>
        <span className="t-small c-muted">
          {allYes ? '' : hasNo ? 'Resolve the connection before continuing' : 'Confirm both checks to continue'}
        </span>
        <button
          type="button"
          className="btn btn--primary btn--lg btn--sheen"
          disabled={!allYes}
          onClick={() => onProceed({ videoVisible: true, audible: true })}
        >
          Start KYC steps
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      <RiskSnapshotModal
        open={snapshotOpen}
        onClose={() => setSnapshotOpen(false)}
        name={customer.name}
        subtitle={`${persona.onboardingChannel} — ${customer.currentAddress.city}, ${customer.currentAddress.state}`}
        riskSnapshot={persona.riskSnapshot}
      />
    </div>
  );
}
