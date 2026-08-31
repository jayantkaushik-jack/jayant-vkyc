import type { Address, GeoFenceResult, VerificationThresholds } from '../data/types';

export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_KM = 6371;

export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return EARTH_KM * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Deterministic mock reverse-geocode → 6-digit PIN from lat/lng. */
export function mockReverseGeocodePin(live: LatLng): string {
  const n = Math.abs(Math.round(live.lat * 10000 + live.lng * 10000));
  const pin = String(400000 + (n % 99999)).padStart(6, '0').slice(0, 6);
  return pin;
}

function pinPrefix(pin: string): string {
  return pin.replace(/\D/g, '').slice(0, 3);
}

export interface GeoFenceAddresses {
  current: Address;
  permanent: Address;
}

/**
 * Geo-fence: pass within radius of current OR permanent coords;
 * else PIN first-3-digit match; else rejected pre-call (customer never reaches an agent).
 */
export function checkGeoFence(
  liveLatLng: LatLng,
  addresses: GeoFenceAddresses,
  config: Pick<VerificationThresholds, 'geoFenceRadiusKm' | 'geoFencePinPrefixEnabled'>,
): GeoFenceResult {
  const radius = config.geoFenceRadiusKm;
  let distanceCurrentKm: number | null = null;
  let distancePermanentKm: number | null = null;

  if (addresses.current.lat != null && addresses.current.lng != null) {
    distanceCurrentKm = Math.round(
      haversineKm(liveLatLng, { lat: addresses.current.lat, lng: addresses.current.lng }) * 10,
    ) / 10;
  }
  if (addresses.permanent.lat != null && addresses.permanent.lng != null) {
    distancePermanentKm = Math.round(
      haversineKm(liveLatLng, { lat: addresses.permanent.lat, lng: addresses.permanent.lng }) * 10,
    ) / 10;
  }

  const withinCurrent = distanceCurrentKm != null && distanceCurrentKm <= radius;
  const withinPermanent = distancePermanentKm != null && distancePermanentKm <= radius;

  if (withinCurrent || withinPermanent) {
    const best = Math.min(
      distanceCurrentKm ?? Number.POSITIVE_INFINITY,
      distancePermanentKm ?? Number.POSITIVE_INFINITY,
    );
    return {
      outcome: 'radius_pass',
      distanceCurrentKm,
      distancePermanentKm,
      livePin: mockReverseGeocodePin(liveLatLng),
      message: `Location verified ✓ (${best.toFixed(1)} km from registered address)`,
    };
  }

  const livePin = mockReverseGeocodePin(liveLatLng);
  if (config.geoFencePinPrefixEnabled) {
    const livePref = pinPrefix(livePin);
    const curPref = pinPrefix(addresses.current.pincode);
    const permPref = pinPrefix(addresses.permanent.pincode);
    if (livePref && (livePref === curPref || livePref === permPref)) {
      return {
        outcome: 'pin_pass',
        distanceCurrentKm,
        distancePermanentKm,
        livePin,
        matchedPinPrefix: livePref,
        message: 'Location verified ✓ (PIN region match)',
      };
    }
  }

  return {
    outcome: 'rejected',
    distanceCurrentKm,
    distancePermanentKm,
    livePin,
    message: 'Please initiate the call from your registered address area',
  };
}

/** Agent-facing pass summary for location panel / Location step. */
export function formatGeoFencePassBasis(result: GeoFenceResult): string {
  if (result.outcome === 'radius_pass') {
    const best = Math.min(
      result.distanceCurrentKm ?? Number.POSITIVE_INFINITY,
      result.distancePermanentKm ?? Number.POSITIVE_INFINITY,
    );
    if (Number.isFinite(best)) {
      return `Geo-fence: passed — ${best.toFixed(1)} km within radius`;
    }
    return 'Geo-fence: passed — within radius';
  }
  if (result.outcome === 'pin_pass') {
    return 'Geo-fence: passed — PIN region match';
  }
  return 'Geo-fence: rejected';
}

/** Hard eKYC / weblink expiry: elapsed since generation exceeds buffer (default 71h50m). */
export function isEkycWindowLapsed(
  generatedAtMs: number,
  nowMs: number,
  bufferMin: number,
): boolean {
  const elapsedMin = (nowMs - generatedAtMs) / 60_000;
  return elapsedMin >= bufferMin;
}
