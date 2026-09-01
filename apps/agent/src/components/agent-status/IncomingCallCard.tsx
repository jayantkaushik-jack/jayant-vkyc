import { useEffect, useState } from 'react';
import { RiskSnapshotModal } from '@agent/components/risk/RiskSnapshotModal';
import { formatDuration } from '@vkyc/shared/lib/format';
import { getInitials } from '@vkyc/shared/lib/avatar';
import type { Customer } from '@vkyc/shared/data/types';
import type { RiskSnapshot } from '@agent/features/agent/call/amber/personas';

interface IncomingCallCardProps {
  customer: Customer;
  incomingSince: number | null;
  riskSnapshot: RiskSnapshot;
  onAccept: () => void;
  onReject: () => void;
}

/**
 * Round 31 — restyled onto `.callcard`/`.ring-avatar` (design system §14,
 * reference screen 06).
 * - **Decline stays a quiet text button and does not respond to Escape** —
 *   the design handoff's own §8 rationale ("someone is waiting") matches
 *   why this was already a plain `Reject` button rather than a modal action;
 *   still no Escape handler here.
 *
 * The `.why` summary panel (a "Score N / Flagged: X / Fired: Y" recap,
 * duplicating the `Amber · {muleScore}` chip already in the heading above
 * it) was removed after this round shipped — the same information is one
 * click away via the "Risk snapshot" button, and having both on screen at
 * once read as the score repeating itself for no reason.
 *
 * Bug 2's *visibility* fix (Round 37) lives one level up, in
 * `IncomingCallOverlay.tsx` — see that file's own comment. That's not
 * specific to this card's own Risk Snapshot button; it reproduces from
 * *any* `RiskSnapshotModal` (including the Queue page's row click) opening
 * while this card happens to be floating on screen.
 *
 * A second, more serious bug (found later, live, on a real laptop-sized
 * window rather than this sandbox's default viewport) was specific to this
 * card's own Risk Snapshot button, though: `.callcard` has its own
 * `backdrop-filter` (the frosted-glass look), and `backdrop-filter` — like
 * `filter`/`transform` — establishes a new containing block for any
 * `position: fixed` descendant. `RiskSnapshotModal`'s `.scrim` used to be
 * nested *inside* the `.callcard` div below, so its "fixed, full-viewport"
 * positioning was actually resolving relative to this ~450px-tall card's
 * own box, not the real viewport — the modal rendered far too small a
 * frame to sit in, with no way to scroll to the rest of it. The other two
 * `RiskSnapshotModal` call sites never had this problem; neither wraps it
 * in an ancestor with a backdrop-filter/filter/transform of its own. Fixed
 * by rendering `RiskSnapshotModal` as a sibling of `.callcard`, not a
 * descendant, so it escapes that trap entirely.
 */
export function IncomingCallCard({ customer, incomingSince, riskSnapshot, onAccept, onReject }: IncomingCallCardProps) {
  const [waitSeconds, setWaitSeconds] = useState(0);
  const [snapshotOpen, setSnapshotOpen] = useState(false);

  useEffect(() => {
    if (!incomingSince) {
      setWaitSeconds(0);
      return;
    }
    const tick = () => setWaitSeconds(Math.floor((Date.now() - incomingSince) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [incomingSince]);

  return (
    <>
    <div className="callcard">
      <p className="t-eyebrow c-muted" style={{ marginBottom: 'var(--s-4)' }}>Incoming V-CIP call</p>

      <div className="ring-avatar">
        <span className="avatar avatar--lg" aria-hidden="true">{getInitials(customer.name)}</span>
      </div>

      <h2 className="t-h1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--s-2)', marginBottom: 'var(--s-4)' }}>
        {customer.name}
        <span className="chip chip--wa">Amber &middot; {riskSnapshot.muleScore}</span>
      </h2>

      <div className="row gap-3" style={{ justifyContent: 'center', marginBottom: 'var(--s-4)' }}>
        <button type="button" className="btn btn--primary btn--lg btn--sheen" onClick={onAccept}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 5c0 8.837 6.163 15 15 15l2-4-6-3-2 2c-3-1-5-3-6-6l2-2-3-6z" />
          </svg>
          Accept call
        </button>
        <button type="button" className="btn btn--secondary btn--lg" onClick={() => setSnapshotOpen(true)}>Risk snapshot</button>
      </div>

      <p className="ring-timer" style={{ justifyContent: 'center', display: 'flex' }}>
        <span className="pulse" aria-hidden="true"><i /></span>
        &nbsp;Waiting {formatDuration(waitSeconds)}
        <span style={{ margin: '0 var(--s-2)', color: 'var(--n-300)' }}>&middot;</span>
        {/*
         * Round 31 — kept as a quiet text button, deliberately not styled to
         * compete with Accept, and still not wired to Escape (design
         * handoff §8: "declining sends a waiting applicant to the back of
         * the queue and should never happen by reflex" — every other
         * overlay in this app closes on Escape; this one intentionally does
         * not, unchanged from before this restyle).
         */}
        <button type="button" className="link-btn" style={{ color: 'var(--da-fg)' }} onClick={onReject}>Decline</button>
      </p>
    </div>

    <RiskSnapshotModal
      open={snapshotOpen}
      onClose={() => setSnapshotOpen(false)}
      name={customer.name}
      subtitle={`${customer.incomeEmployment?.occupation ?? 'Occupation not on file'} — ${customer.currentAddress.city}, ${customer.currentAddress.state}`}
      riskSnapshot={riskSnapshot}
    />
    </>
  );
}
