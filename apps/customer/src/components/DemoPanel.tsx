import { Button } from '@vkyc/shared/components/ui/Button';
import { X } from 'lucide-react';
import { useCustomerJourney } from '@customer/features/customer/CustomerJourneyContext';
import {
  DEMO_GEO_LOCATIONS,
  MOCK_REGISTERED_ADDRESSES,
} from '@customer/features/customer/journeyConfig';
import { getAdminConfig } from '@vkyc/shared/data/sessionStore';
import { checkGeoFence } from '@vkyc/shared/lib/geoFence';
import type { GeoFenceOutcome } from '@vkyc/shared/data/types';

export function DemoPanel() {
  const {
    demoOpen,
    toggleDemo,
    triggerFailure,
    triggerReconnect,
    triggerSteppedAway,
    setReattemptMode,
    setPhase,
    logEvent,
    phase,
    applyGeoFenceResult,
    setForceCameraQualityFail,
    setForceMicFail,
    simulateNearExpiry,
    setPrecheckIndex,
    simulateOutsideHours,
    setSimulateOutsideHours,
  } = useCustomerJourney();

  if (!demoOpen) return null;

  const canReconnect = phase === 'incall';

  const simulateGeo = (outcome: GeoFenceOutcome) => {
    const live = DEMO_GEO_LOCATIONS[outcome];
    const thresholds = getAdminConfig().thresholds;
    const result = checkGeoFence(live, MOCK_REGISTERED_ADDRESSES, {
      geoFenceRadiusKm: thresholds.geoFenceRadiusKm,
      geoFencePinPrefixEnabled: thresholds.geoFencePinPrefixEnabled,
    });
    applyGeoFenceResult(result, live);
    if (result.outcome !== 'rejected') {
      setPhase('landing');
    }
    logEvent(`Demo: geo-fence → ${result.outcome}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 md:items-center md:justify-end md:pr-8">
      <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-xl border-2 border-dashed border-warning bg-surface p-4 shadow-card">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-warning">Demo controls</p>
            <p className="text-[11px] text-text-muted">Failure states &amp; call simulations</p>
          </div>
          <button type="button" onClick={toggleDemo} className="rounded-lg p-1 hover:bg-primary-soft">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <section>
            <p className="mb-1.5 text-xs font-medium text-text-muted">Location / geo-fence</p>
            <div className="grid grid-cols-1 gap-1.5">
              <Button size="sm" variant="secondary" onClick={() => simulateGeo('radius_pass')}>
                Within radius
              </Button>
              <Button size="sm" variant="secondary" onClick={() => simulateGeo('pin_pass')}>
                PIN region match
              </Button>
              <Button size="sm" variant="secondary" onClick={() => simulateGeo('rejected')}>
                Rejected (outside area)
              </Button>
            </div>
          </section>

          <section>
            <p className="mb-1.5 text-xs font-medium text-text-muted">Service hours</p>
            <Button
              size="sm"
              variant={simulateOutsideHours ? 'primary' : 'secondary'}
              className="w-full"
              onClick={() => {
                const next = !simulateOutsideHours;
                setSimulateOutsideHours(next);
                logEvent(next ? 'Demo: simulate outside service hours ON' : 'Demo: outside hours OFF');
              }}
            >
              {simulateOutsideHours ? 'Outside hours: ON' : 'Simulate outside service hours'}
            </Button>
          </section>

          <section>
            <p className="mb-1.5 text-xs font-medium text-text-muted">Quality check force-fail</p>
            <div className="grid grid-cols-2 gap-1.5">
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setForceCameraQualityFail(true);
                  setPrecheckIndex(5);
                  setPhase('prechecks');
                  logEvent('Demo: force camera quality fail');
                }}
              >
                Fail camera quality
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setForceMicFail(true);
                  setPrecheckIndex(6);
                  setPhase('prechecks');
                  logEvent('Demo: force microphone fail');
                }}
              >
                Fail microphone
              </Button>
            </div>
          </section>

          <section>
            <p className="mb-1.5 text-xs font-medium text-text-muted">eKYC window</p>
            <Button size="sm" variant="secondary" className="w-full" onClick={simulateNearExpiry}>
              Simulate near-expiry (71h55m)
            </Button>
          </section>

          <section>
            <p className="mb-1.5 text-xs font-medium text-text-muted">Pre-call failures</p>
            <div className="grid grid-cols-2 gap-1.5">
              <Button size="sm" variant="secondary" onClick={() => triggerFailure('vpn')}>VPN detected</Button>
              <Button size="sm" variant="secondary" onClick={() => triggerFailure('outside_india')}>Outside India</Button>
              <Button size="sm" variant="secondary" onClick={() => triggerFailure('ekyc_expired')}>eKYC expired</Button>
              <Button size="sm" variant="secondary" onClick={() => triggerFailure('link_expired')}>Link expired</Button>
              <Button size="sm" variant="secondary" className="col-span-2" onClick={() => triggerFailure('blacklisted')}>
                Blacklisted
              </Button>
            </div>
          </section>

          <section>
            <p className="mb-1.5 text-xs font-medium text-text-muted">In-call simulation</p>
            <div className="grid grid-cols-2 gap-1.5">
              <Button
                size="sm"
                variant="secondary"
                disabled={!canReconnect}
                onClick={triggerReconnect}
              >
                Force reconnect
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={phase !== 'incall'}
                onClick={triggerSteppedAway}
              >
                Stepped away
              </Button>
            </div>
          </section>

          <section>
            <p className="mb-1.5 text-xs font-medium text-text-muted">Outcome variants</p>
            <Button
              size="sm"
              variant="secondary"
              className="w-full"
              onClick={() => {
                setReattemptMode(true);
                setPhase('reattempt');
                logEvent('Demo: reattempt / dropped KYC variant');
              }}
            >
              Recapture / reattempt variant
            </Button>
          </section>
        </div>
      </div>
    </div>
  );
}
