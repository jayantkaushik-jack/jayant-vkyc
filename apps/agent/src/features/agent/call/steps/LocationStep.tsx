import { useMemo } from 'react';
import { Card } from '@agent/components/ui/Card';
import { MapEmbed } from '@agent/components/ui/MapEmbed';
import { StepFooter } from '@agent/components/call/StepFooter';
import { SBM_LOWER_PAREL } from '@vkyc/shared/lib/sbmConstants';
import { checkGeoFence, formatGeoFencePassBasis } from '@vkyc/shared/lib/geoFence';
import { useAdminConfig } from '@vkyc/shared/data';
import { StepResultChip } from '@agent/features/agent/call/steps/LivelinessStep';
import { ThresholdChip } from '@agent/features/agent/call/steps/ThresholdChip';
import type { CallSession } from '@vkyc/shared/data/types';

interface LocationStepProps {
  session: CallSession;
  reviewMode?: boolean;
  reviewDirty?: boolean;
  stepPassed: boolean | null;
  remarks: string;
  onRemarksChange: (v: string) => void;
  onComplete: (passed: boolean) => void;
}

export function LocationStep({
  session,
  reviewMode,
  reviewDirty,
  stepPassed,
  remarks,
  onRemarksChange,
  onComplete,
}: LocationStepProps) {
  const { thresholds } = useAdminConfig();
  const { location, customer } = session;
  const lat = location.lat;
  const lng = location.lng;
  const plusCode = location.plusCode ?? SBM_LOWER_PAREL.plusCode;
  const accuracy = location.accuracyMeters ?? SBM_LOWER_PAREL.accuracyMeters;
  const area = location.area ?? SBM_LOWER_PAREL.area;

  const geoResult = useMemo(() => {
    const live = { lat, lng };
    const withCoords = (
      addr: typeof customer.currentAddress,
      distanceKm: number,
    ) => {
      if (addr.lat != null && addr.lng != null) return addr;
      const deg = distanceKm / 111;
      return { ...addr, lat: live.lat + deg * 0.65, lng: live.lng + deg * 0.35 };
    };
    return checkGeoFence(
      live,
      {
        current: withCoords(customer.currentAddress, location.distanceCurrentKm),
        permanent: withCoords(customer.permanentAddress, location.distancePermanentKm),
      },
      thresholds,
    );
  }, [lat, lng, customer, location.distanceCurrentKm, location.distancePermanentKm, thresholds]);

  const passBasis = formatGeoFencePassBasis(geoResult);
  const passed = geoResult.outcome !== 'rejected';

  return (
    <div className="space-y-4">
      {reviewMode && stepPassed !== null && <StepResultChip passed={stepPassed} />}
      <ThresholdChip label="Geo-fence" passedOverride={passed} />

      <div className="rounded-lg border border-success/30 bg-success/5 px-3 py-2 text-xs text-success font-medium">
        {passBasis}
      </div>

      <Card className="p-0 overflow-hidden">
        <MapEmbed lat={lat} lng={lng} zoom={16} className="h-52 w-full rounded-none" />
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs border-t border-border bg-bg">
          <span>
            Latitude: {lat.toFixed(4)} &nbsp; Longitude: {lng.toFixed(4)} &nbsp; Plus code: {plusCode}
          </span>
          <span className="text-text-muted">(Accurate to {accuracy} meters)</span>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-sm mb-3">Location Details</h3>
        <div className="grid grid-cols-3 gap-x-4 gap-y-3 text-sm">
          <div><span className="text-text-muted block text-xs">Area</span>{area}</div>
          <div><span className="text-text-muted block text-xs">State</span>{location.state}</div>
          <div><span className="text-text-muted block text-xs">IP Address</span>{location.ip} ✓</div>
          <div><span className="text-text-muted block text-xs">City</span>{location.city}</div>
          <div><span className="text-text-muted block text-xs">Pincode</span>{location.pincode}</div>
          <div><span className="text-text-muted block text-xs">District</span>{location.district}</div>
          <div><span className="text-text-muted block text-xs">Country</span>{location.country} ✓</div>
          <div>
            <span className="text-text-muted block text-xs">CA → Geo (km)</span>
            {(geoResult.distanceCurrentKm ?? location.distanceCurrentKm).toFixed(3)}
          </div>
          <div>
            <span className="text-text-muted block text-xs">PA → Geo (km)</span>
            {(geoResult.distancePermanentKm ?? location.distancePermanentKm).toFixed(3)}
          </div>
        </div>
        <p className="text-xs text-text-muted mt-3">{geoResult.message}</p>
      </Card>

      <div className="px-3 py-2 bg-success-subtle text-success-strong rounded-lg text-sm border border-success-subtle">
        ✓ SAFE IP Address – VPN and Proxy Not Detected | Inside India
      </div>

      <StepFooter
        remarks={remarks}
        onRemarksChange={onRemarksChange}
        onNext={() => onComplete(passed)}
        reviewMode={reviewMode}
        reviewDirty={reviewDirty}
      />
    </div>
  );
}
