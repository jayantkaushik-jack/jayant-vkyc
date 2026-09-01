import { useNavigate, useLocation } from 'react-router-dom';
import { useAgent } from '@agent/features/agent/AgentContext';
import { IncomingCallCard } from '@agent/components/agent-status/IncomingCallCard';
import { PERSONAS } from '@agent/features/agent/call/amber/personas';

export function IncomingCallOverlay() {
  const { currentCustomer, status, acceptCall, clearCall, incomingSince, demoPersonaId, isRiskSnapshotOpen } = useAgent();
  const navigate = useNavigate();
  const location = useLocation();

  const onCallRoom = /^\/agent\/call\//.test(location.pathname);

  if (!currentCustomer || status !== 'online' || onCallRoom) return null;

  const handleAccept = () => {
    const callId = acceptCall();
    navigate(`/agent/call/${callId}`);
  };

  return (
    /*
     * Anchored to the content column, not the viewport: `left-sidebar` is the same token the
     * LeftNavbar pins its width with, so the card centres over the page rather than drifting
     * left under the sidebar. Call-room routes bail out above (no sidebar there); every other
     * authenticated route, including the queue, renders through here.
     *
     * z-50 puts it over the sticky header (z-40); it used to share z-40 and relied on DOM
     * order to win.
     *
     * Round 37 (Bug 1) — this used to also bail out on `/agent/queue` specifically because
     * `QueuePage` rendered its own separate, non-fixed copy of this same card inline after the
     * queue table — meaning on a long queue, the card (and the risk-dimension legend row right
     * below the table) were pushed below the fold, requiring a full page scroll to reach either.
     * `QueuePage`'s own copy is gone; this fixed, always-on-top overlay is now the single render
     * path for every route, so the card is guaranteed visible regardless of queue length or
     * scroll position, exactly like it already was everywhere else.
     *
     * Round 37 (Bug 2) — floating this card globally (the fix directly above) meant *any*
     * `RiskSnapshotModal` opening anywhere (this card's own button, or the Queue page's row
     * click, which sits on a totally different component) would stack its scrim on top of this
     * still-visible card, ghosting its bright box through the scrim's translucent backdrop.
     * `visibility: hidden` while `isRiskSnapshotOpen` is true — not `display: none` — keeps this
     * wrapper's DOM subtree mounted (so this card's own nested modal instance, one of the three
     * things that can set that flag, isn't torn down by the very state change it caused) while
     * still making the card itself invisible and non-interactive; `.scrim`'s own explicit
     * `visibility: visible` (cf-design-system.css) overrides the inherited `hidden` so the modal
     * itself is unaffected regardless of which of the three call sites opened it.
     */
    <div
      className="pointer-events-none fixed inset-y-0 right-0 left-sidebar z-50 flex items-end justify-center p-6"
      style={{ visibility: isRiskSnapshotOpen ? 'hidden' : 'visible' }}
    >
      {/* No shadow here — Card brings its own, and two stacked read as a muddy halo. */}
      <div className="pointer-events-auto w-full max-w-md">
        <IncomingCallCard
          customer={currentCustomer}
          incomingSince={incomingSince}
          riskSnapshot={PERSONAS[demoPersonaId].riskSnapshot}
          onAccept={handleAccept}
          onReject={clearCall}
        />
      </div>
    </div>
  );
}
