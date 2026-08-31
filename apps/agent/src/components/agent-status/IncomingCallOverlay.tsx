import { useNavigate, useLocation } from 'react-router-dom';
import { useAgent } from '@agent/features/agent/AgentContext';
import { IncomingCallCard } from '@agent/components/agent-status/IncomingCallCard';
import { PERSONAS } from '@agent/features/agent/call/amber/personas';

export function IncomingCallOverlay() {
  const { currentCustomer, status, acceptCall, clearCall, incomingSince, demoPersonaId } = useAgent();
  const navigate = useNavigate();
  const location = useLocation();

  const onCallRoom = /^\/agent\/call\//.test(location.pathname);
  const onQueue = location.pathname === '/agent/queue';

  if (!currentCustomer || status !== 'online' || onCallRoom || onQueue) return null;

  const handleAccept = () => {
    const callId = acceptCall();
    navigate(`/agent/call/${callId}`);
  };

  return (
    /*
     * Anchored to the content column, not the viewport: `left-sidebar` is the same token the
     * LeftNavbar pins its width with, so the card centres over the page rather than drifting
     * left under the sidebar. The overlay only ever renders on routes that have the sidebar —
     * the queue and call room both bail out above — so the offset is unconditional.
     *
     * z-50 puts it over the sticky header (z-40); it used to share z-40 and relied on DOM
     * order to win.
     */
    <div className="pointer-events-none fixed inset-y-0 right-0 left-sidebar z-50 flex items-end justify-center p-6">
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
