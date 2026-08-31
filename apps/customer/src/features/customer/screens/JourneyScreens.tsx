import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  AGENT_OFFICER,
  COPY,
  formatValidityRemaining,
  MOCK_REGISTERED_ADDRESSES,
} from '@customer/features/customer/journeyConfig';
import { useCustomerJourney } from '@customer/features/customer/CustomerJourneyContext';
import { Button } from '@vkyc/shared/components/ui/Button';
import { CameraPreview } from '@customer/components/CameraPreview';
import { CaptureGuideOverlay, useVideoContainerSize } from '@customer/components/CaptureGuideOverlay';
import { InCallStepper } from '@customer/components/InCallStepper';
import { getAdminConfig, useAdminConfig } from '@vkyc/shared/data/sessionStore';
import { getAvatarUrl } from '@vkyc/shared/lib/avatar';
import { checkGeoFence } from '@vkyc/shared/lib/geoFence';
import {
  formatNextOpening,
  formatServiceHoursLine,
  generateBookingSlots,
  isWithinServiceHours,
  nextOpeningTime,
} from '@vkyc/shared/lib/serviceHours';
import { overlayForScriptIndex, useInCallSimulation } from '@customer/hooks/useInCallSimulation';
import {
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  Globe,
  MapPin,
  MessageCircle,
  Mic,
  PenLine,
  Send,
  Shield,
  Signal,
  Video,
  Wifi,
  X,
  XCircle,
} from 'lucide-react';

function Screen({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`px-4 py-5 ${className}`}>{children}</div>;
}

function LangChip({ code, label }: { code: 'en' | 'hi'; label: string }) {
  const { language, setLanguage } = useCustomerJourney();
  const active = language === code;
  return (
    <button
      type="button"
      onClick={() => setLanguage(code)}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-text-muted'
      }`}
    >
      {label}
    </button>
  );
}

export function LandingScreen() {
  const {
    application,
    language,
    setPhase,
    logEvent,
    geoFenceResult,
    liveLocation,
    applyGeoFenceResult,
    simulateOutsideHours,
  } = useCustomerJourney();
  const { serviceHours } = useAdminConfig();
  const [remaining, setRemaining] = useState(application.validityEndsAt - Date.now());
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setRemaining(application.validityEndsAt - Date.now()), 1000);
    return () => clearInterval(id);
  }, [application.validityEndsAt]);

  const runGeoFence = (lat: number, lng: number) => {
    const thresholds = getAdminConfig().thresholds;
    const result = checkGeoFence(
      { lat, lng },
      MOCK_REGISTERED_ADDRESSES,
      {
        geoFenceRadiusKm: thresholds.geoFenceRadiusKm,
        geoFencePinPrefixEnabled: thresholds.geoFencePinPrefixEnabled,
      },
    );
    applyGeoFenceResult(result, { lat, lng });
  };

  const verifyLocation = () => {
    setLocating(true);
    if (!navigator.geolocation) {
      setLocating(false);
      logEvent('Geolocation unavailable — showing guidance');
      setPhase('location_denied');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        runGeoFence(pos.coords.latitude, pos.coords.longitude);
      },
      () => {
        setLocating(false);
        logEvent('Location permission denied');
        setPhase('location_denied');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  };

  const locationCaptured =
    liveLocation != null &&
    geoFenceResult != null &&
    geoFenceResult.outcome !== 'rejected';
  const canInitiate = locationCaptured;
  const hoursLine = formatServiceHoursLine(serviceHours);

  const tiles = [
    { icon: Wifi, title: 'Good Internet Connectivity', sub: 'Ensure your internet connection is stable' },
    { icon: FileText, title: 'Stay Document-ready!', sub: 'Keep your original physical PAN Card handy to show during the call' },
    { icon: Video, title: 'Find a quiet, well-lit spot', sub: 'Please choose a quiet & well-lit spot for a smooth verification' },
    { icon: PenLine, title: 'Keep a pen and blank paper handy', sub: 'You need to give a live signature during the call' },
  ];

  return (
    <Screen>
      <h1 className="text-lg font-semibold text-text">Instructions</h1>
      <p className="mt-1 text-sm text-text-muted">
        Please read the instructions carefully before getting on a video call with the agent
      </p>

      <div className="mt-4 rounded-xl border border-border bg-primary-soft p-3">
        <p className="text-sm font-medium text-text">{application.productLabel}</p>
        <p className="mt-1 text-xs text-text-muted">Application ID: {application.appId}</p>
        <p className="mt-2 text-xs font-semibold text-primary">
          Valid for {formatValidityRemaining(remaining)}
        </p>
      </div>

      <div className="mt-4 grid gap-2">
        {tiles.map((t) => (
          <div key={t.title} className="flex gap-3 rounded-lg border border-border p-3">
            <t.icon size={20} className="mt-0.5 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium text-text">{t.title}</p>
              <p className="text-xs text-text-muted">{t.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg bg-bg p-3 text-xs text-text-muted">
        <p className="font-semibold text-text">Please note:</p>
        <ul className="mt-2 list-disc space-y-1.5 pl-4">
          <li>The Video KYC process will take 3–5 minutes</li>
          <li>You will be asked security questions during the call</li>
          <li>Please ensure that you are not connected through a Proxy/VPN or any Public IP</li>
          <li>
            If you are an iOS user, please deactivate your Private Relay before initiating the call — Steps:
            Settings → iCloud → iCloud+ features → Private Relay
          </li>
          <li>{hoursLine}</li>
          <li>It is mandatory for you to initiate the call from your Permanent or Communication address provided earlier</li>
        </ul>
      </div>

      <div className="mt-4 rounded-xl border border-border p-3">
        <div className="flex items-start gap-2">
          <MapPin size={18} className="mt-0.5 shrink-0 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-text">Verify your location</p>
            <p className="mt-0.5 text-xs text-text-muted">
              Location access is required before you can continue to consent.
            </p>
          </div>
        </div>
        {geoFenceResult && geoFenceResult.outcome !== 'rejected' ? (
          <div className="mt-3 rounded-lg bg-success/10 px-3 py-2 text-xs font-medium text-success">
            {geoFenceResult.message}
          </div>
        ) : (
          <Button
            className="mt-3 w-full"
            variant="secondary"
            disabled={locating}
            onClick={verifyLocation}
          >
            <MapPin size={16} />
            {locating ? 'Capturing location…' : 'Verify your location'}
          </Button>
        )}
        {geoFenceResult && geoFenceResult.outcome !== 'rejected' && (
          <button
            type="button"
            className="mt-2 w-full text-center text-[11px] text-primary underline underline-offset-2"
            onClick={verifyLocation}
          >
            Re-verify location
          </button>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <span className="text-xs text-text-muted">Language:</span>
        <LangChip code="en" label="English" />
        <LangChip code="hi" label="हिंदी" />
      </div>

      <p className="mt-3 text-[11px] text-text-muted">
        This video call may be recorded for regulatory compliance under RBI V-CIP guidelines.
      </p>

      <Button
        className="mt-4 w-full"
        size="lg"
        disabled={!canInitiate}
        onClick={() => {
          logEvent('Clicked Initiate video KYC');
          const open = isWithinServiceHours(new Date(), serviceHours, {
            forceOutside: simulateOutsideHours,
          });
          if (!open) {
            logEvent('Outside service hours — booking screen');
            setPhase('service_closed');
            return;
          }
          setPhase('consent');
        }}
      >
        <Video size={18} />
        {COPY.initiateCall[language]}
      </Button>
      {!liveLocation && (
        <p className="mt-2 text-center text-[11px] text-text-muted">
          Verify your location to continue
        </p>
      )}
    </Screen>
  );
}

export function LocationDeniedScreen() {
  const { setPhase, logEvent } = useCustomerJourney();
  return (
    <Screen className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <MapPin size={40} className="text-warning" />
      <h1 className="mt-4 text-lg font-semibold">Location access needed</h1>
      <p className="mt-2 max-w-xs text-sm text-text-muted">
        Enable location for this site in your browser settings, then retry. Video KYC must start from
        your registered address area.
      </p>
      <ul className="mt-3 list-disc space-y-1 pl-4 text-left text-xs text-text-muted">
        <li><strong>Chrome:</strong> Lock icon → Site settings → Location → Allow</li>
        <li><strong>Safari:</strong> Settings → Safari → Location → Allow</li>
        <li><strong>Firefox:</strong> Permissions icon in the address bar → Allow</li>
      </ul>
      <Button
        className="mt-6"
        onClick={() => {
          logEvent('Retry location capture');
          setPhase('landing');
        }}
      >
        Retry
      </Button>
    </Screen>
  );
}

export function LocationRejectedScreen() {
  const { setPhase, clearLocationCapture, logEvent } = useCustomerJourney();
  return (
    <Screen className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <span className="rounded-full bg-danger/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-danger">
        CUSTOMER_RESTRICTED
      </span>
      <MapPin size={40} className="mt-4 text-danger" />
      <h1 className="mt-4 text-lg font-semibold">Please initiate the call from your registered address area</h1>
      <p className="mt-2 max-w-xs text-sm text-text-muted">
        Your live location is outside the registered area. Move to your permanent or communication
        address, then retry within the link validity window.
      </p>
      <div className="mt-6 flex w-full flex-col gap-2">
        <Button
          className="w-full"
          onClick={() => {
            clearLocationCapture();
            logEvent('Retry location after geo-fence rejection');
            setPhase('landing');
          }}
        >
          Retry from registered area
        </Button>
      </div>
    </Screen>
  );
}

export function ServiceClosedScreen() {
  const { setPhase, bookSlot, bookedSlotLabel, simulateOutsideHours } = useCustomerJourney();
  const { serviceHours } = useAdminConfig();
  const [toast, setToast] = useState<string | null>(null);
  const now = new Date();
  const next = nextOpeningTime(now, serviceHours);
  const slots = generateBookingSlots(now, serviceHours);
  const hoursLine = formatServiceHoursLine(serviceHours);

  return (
    <Screen>
      <div className="flex flex-col items-center text-center">
        <Clock size={40} className="text-primary" />
        <h1 className="mt-4 text-lg font-semibold">Service currently closed</h1>
        <p className="mt-2 text-sm text-text-muted">{hoursLine}</p>
        <p className="mt-2 text-xs font-medium text-primary">
          Next opening: {formatNextOpening(next)}
          {simulateOutsideHours ? ' (demo override)' : ''}
        </p>
      </div>

      <div className="mt-6 rounded-xl border border-border p-3">
        <p className="text-sm font-medium text-text">Book a slot</p>
        <p className="mt-0.5 text-xs text-text-muted">Pick a time in the next working window.</p>
        <div className="mt-3 grid gap-1.5">
          {slots.map((slot) => (
            <Button
              key={slot.id}
              size="sm"
              variant={bookedSlotLabel === slot.label ? 'primary' : 'secondary'}
              className="w-full justify-start"
              onClick={() => {
                bookSlot(slot.label);
                setToast(`Slot booked for ${slot.label}`);
              }}
            >
              {slot.label}
            </Button>
          ))}
        </div>
        {toast && (
          <p className="mt-3 rounded-lg bg-success/10 px-3 py-2 text-xs font-medium text-success">
            {toast}
          </p>
        )}
        {bookedSlotLabel && !toast && (
          <p className="mt-3 text-xs text-text-muted">Booked: {bookedSlotLabel}</p>
        )}
      </div>

      <Button variant="ghost" className="mt-4 w-full" onClick={() => setPhase('landing')}>
        Back to instructions
      </Button>
    </Screen>
  );
}

export function ConsentScreen() {
  const { acceptConsent, setPhase, consentAt } = useCustomerJourney();
  const [checked, setChecked] = useState(false);

  return (
    <Screen>
      <h1 className="text-lg font-semibold text-text">Terms &amp; Consent</h1>
      <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-border p-3 text-xs leading-relaxed text-text-muted">
        <p>
          By proceeding, you consent to a live video interaction for Video KYC (V-CIP) as prescribed by RBI.
          Your video, audio, and identity documents will be captured and stored securely for verification
          and audit purposes. Data is processed only for account opening / credit assessment and shared
          with SBM Bank and its regulated partners. You may decline; you can return within the validity window.
        </p>
        <p className="mt-2">
          Recordings are retained per regulatory requirements. Contact SBM Bank support for privacy queries.
        </p>
      </div>

      {consentAt && (
        <p className="mt-2 text-[11px] text-success">Accepted at {new Date(consentAt).toLocaleString()}</p>
      )}

      <label className="mt-4 flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="mt-1 rounded border-border"
        />
        <span>I have read and agree to the Terms &amp; Conditions</span>
      </label>

      <div className="mt-4 flex flex-col gap-2">
        <Button className="w-full" disabled={!checked} onClick={acceptConsent}>
          {COPY.acceptContinue.en}
        </Button>
        <Button variant="ghost" className="w-full" onClick={() => setPhase('decline_exit')}>
          Decline
        </Button>
      </div>
    </Screen>
  );
}

export function DeclineExitScreen() {
  const { setPhase } = useCustomerJourney();
  return (
    <Screen className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <XCircle size={40} className="text-text-muted" />
      <h1 className="mt-4 text-lg font-semibold">You chose not to proceed</h1>
      <p className="mt-2 text-sm text-text-muted">
        You can return anytime within the validity window to complete your Video KYC.
      </p>
      <Button className="mt-6" onClick={() => setPhase('landing')}>Back to instructions</Button>
    </Screen>
  );
}

export function PermissionsScreen({
  onRequest,
  stream,
  simulated,
}: {
  onRequest: () => Promise<boolean>;
  stream: MediaStream | null;
  simulated: boolean;
}) {
  const { setPhase, logEvent, permissionsGranted, customerName } = useCustomerJourney();
  const [requested, setRequested] = useState(simulated && permissionsGranted);

  const handleRequest = async () => {
    setRequested(true);
    const ok = await onRequest();
    if (ok) {
      logEvent('Camera & microphone permissions granted');
    } else {
      logEvent('Permissions denied — showing recovery');
      setPhase('permissions_denied');
    }
  };

  const showPreview = requested || (simulated && permissionsGranted);
  const canContinue = permissionsGranted || (showPreview && (stream !== null || simulated));

  useEffect(() => {
    if (stream && !permissionsGranted) {
      logEvent('Live self-view preview active');
    }
  }, [stream, permissionsGranted, logEvent]);

  return (
    <Screen>
      <h1 className="text-lg font-semibold text-text">Camera &amp; Microphone</h1>
      <div className="mt-3 rounded-lg border border-border bg-primary-soft p-3 text-sm text-text-muted">
        We need your camera &amp; microphone for the video call with the bank official.
      </div>

      {!showPreview ? (
        <Button className="mt-4 w-full" onClick={() => void handleRequest()}>
          <Mic size={16} /> Allow access
        </Button>
      ) : (
        <>
          <div className="mt-4 aspect-[3/4] w-full overflow-hidden rounded-xl">
            <CameraPreview stream={stream} simulated={simulated} className="h-full w-full" customerName={customerName} />
          </div>
          {canContinue && (
            <Button
              className="mt-4 w-full"
              onClick={() => {
                logEvent('Proceeding to pre-call checks');
                setPhase('prechecks');
              }}
            >
              Continue
            </Button>
          )}
        </>
      )}
    </Screen>
  );
}

export function PermissionsDeniedScreen({
  onRetry,
  onSimulated,
}: {
  onRetry: () => Promise<boolean>;
  onSimulated: () => void;
}) {
  const { setPhase } = useCustomerJourney();
  return (
    <Screen>
      <h1 className="text-lg font-semibold text-text">Permissions required</h1>
      <p className="mt-2 text-sm text-text-muted">
        Camera and microphone access is required for Video KYC. Enable permissions in your browser settings and retry.
      </p>
      <ul className="mt-3 list-disc space-y-1 pl-4 text-xs text-text-muted">
        <li><strong>Chrome:</strong> Click the lock icon → Site settings → Allow Camera &amp; Microphone</li>
        <li><strong>Safari:</strong> Settings → Safari → Camera/Microphone → Allow for this site</li>
        <li><strong>Firefox:</strong> Click the permissions icon in the address bar → Allow</li>
      </ul>
      <div className="mt-4 flex flex-col gap-2">
        <Button className="w-full" onClick={() => { setPhase('permissions'); void onRetry(); }}>Retry</Button>
        <Button variant="secondary" className="w-full" onClick={() => { onSimulated(); setPhase('permissions'); }}>
          Continue with simulated camera
        </Button>
      </div>
    </Screen>
  );
}

const PRECHECK_ITEMS = [
  { id: 'device', label: 'Device & browser', kind: 'auto' as const },
  { id: 'internet', label: 'Internet speed', kind: 'auto' as const },
  { id: 'vpn', label: 'VPN / Proxy', kind: 'auto' as const },
  { id: 'location', label: 'Location (geolocate)', kind: 'auto' as const },
  { id: 'ekyc', label: 'Aadhaar eKYC validity', kind: 'auto' as const },
  { id: 'camera_quality', label: 'Camera quality', kind: 'camera' as const },
  { id: 'mic', label: 'Microphone check', kind: 'mic' as const },
];

type QualityFailReason = { title: string; guidance: string } | null;

function sampleCameraQuality(
  stream: MediaStream | null,
  forceFail: boolean,
): { ok: boolean; detail: string; fail: QualityFailReason } {
  if (forceFail) {
    return {
      ok: false,
      detail: 'Brightness too low',
      fail: { title: 'Camera quality check failed', guidance: 'Move to a brighter spot and clean your camera lens, then re-test.' },
    };
  }
  const track = stream?.getVideoTracks()[0];
  const settings = track?.getSettings();
  const width = settings?.width ?? 1280;
  const height = settings?.height ?? 720;
  const fps = settings?.frameRate ?? 30;
  // Simulated brightness / sharpness scores (pass path)
  const brightness = 0.62;
  const sharpness = 180;
  if (brightness < 0.35) {
    return {
      ok: false,
      detail: 'Low brightness',
      fail: { title: 'Camera too dark', guidance: 'Move to a brighter spot, then re-test.' },
    };
  }
  if (sharpness < 80) {
    return {
      ok: false,
      detail: 'Image not sharp',
      fail: { title: 'Camera not sharp enough', guidance: 'Clean your camera lens and hold the phone steady, then re-test.' },
    };
  }
  return {
    ok: true,
    detail: `${width}×${height} @ ${Math.round(fps)}fps · bright & sharp`,
    fail: null,
  };
}

function sampleMicLevel(forceFail: boolean): { ok: boolean; detail: string; fail: QualityFailReason } {
  if (forceFail) {
    return {
      ok: false,
      detail: 'Signal too quiet',
      fail: {
        title: 'Microphone check failed',
        guidance: 'Speak clearly into the mic, remove any mute accessories, then re-test.',
      },
    };
  }
  const rms = 0.28;
  if (rms < 0.08) {
    return {
      ok: false,
      detail: 'No speech detected',
      fail: {
        title: 'We could not hear you',
        guidance: 'Say “hello” clearly and ensure the microphone is not blocked, then re-test.',
      },
    };
  }
  return { ok: true, detail: 'Voice level OK', fail: null };
}

export function PrechecksScreen({
  stream,
}: {
  stream: MediaStream | null;
}) {
  const {
    setPhase,
    logEvent,
    precheckIndex,
    setPrecheckIndex,
    forceCameraQualityFail,
    forceMicFail,
    setForceCameraQualityFail,
    setForceMicFail,
    checkEkycWindow,
  } = useCustomerJourney();

  const [qualityFail, setQualityFail] = useState<QualityFailReason>(null);
  const [qualityDetail, setQualityDetail] = useState<string | null>(null);
  const [micListening, setMicListening] = useState(false);
  const [failedIds, setFailedIds] = useState<Set<string>>(new Set());
  const [qualityAttempt, setQualityAttempt] = useState(0);

  const current = PRECHECK_ITEMS[precheckIndex];
  const isQuality = current?.kind === 'camera' || current?.kind === 'mic';

  useEffect(() => {
    setQualityFail(null);
    setQualityDetail(null);
    setMicListening(false);
    setFailedIds(new Set());
    setQualityAttempt(0);
  }, [precheckIndex]);

  useEffect(() => {
    if (precheckIndex >= PRECHECK_ITEMS.length) {
      logEvent('All pre-call checks passed');
      setPhase('waiting');
      return;
    }
    const item = PRECHECK_ITEMS[precheckIndex];
    if (item.kind !== 'auto') return;

    if (item.id === 'ekyc' && checkEkycWindow()) {
      return;
    }

    const id = setTimeout(() => setPrecheckIndex(precheckIndex + 1), 500);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- actions are stable; only index drives the timer
  }, [precheckIndex]);

  useEffect(() => {
    if (!current || current.kind !== 'camera' || qualityFail) return;
    const t = setTimeout(() => {
      const result = sampleCameraQuality(stream, forceCameraQualityFail);
      setQualityDetail(result.detail);
      if (result.ok) {
        logEvent(`Camera quality passed — ${result.detail}`);
        setForceCameraQualityFail(false);
        setPrecheckIndex(precheckIndex + 1);
        setQualityDetail(null);
      } else {
        setQualityFail(result.fail);
        setFailedIds((prev) => new Set(prev).add(current.id));
        logEvent(`Camera quality failed — ${result.detail}`);
      }
    }, 900);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [precheckIndex, qualityFail, forceCameraQualityFail, qualityAttempt]);

  useEffect(() => {
    if (!current || current.kind !== 'mic' || qualityFail) return;
    setMicListening(true);
    logEvent('Microphone check — listening for “hello”');
    const t = setTimeout(() => {
      const result = sampleMicLevel(forceMicFail);
      setQualityDetail(result.detail);
      setMicListening(false);
      if (result.ok) {
        logEvent(`Microphone check passed — ${result.detail}`);
        setForceMicFail(false);
        setPrecheckIndex(precheckIndex + 1);
        setQualityDetail(null);
      } else {
        setQualityFail(result.fail);
        setFailedIds((prev) => new Set(prev).add(current.id));
        logEvent(`Microphone check failed — ${result.detail}`);
      }
    }, 2000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [precheckIndex, qualityFail, forceMicFail, qualityAttempt]);

  const retest = () => {
    setQualityFail(null);
    setQualityDetail(null);
    setMicListening(false);
    setFailedIds((prev) => {
      const next = new Set(prev);
      if (current) next.delete(current.id);
      return next;
    });
    setQualityAttempt((n) => n + 1);
    logEvent(`Re-testing ${current?.label ?? 'quality check'}`);
  };

  return (
    <Screen className="flex min-h-[60vh] flex-col justify-center">
      <h1 className="text-lg font-semibold text-text">Pre-call checks</h1>
      <p className="mt-1 text-sm text-text-muted">Verifying your device and environment…</p>
      <ul className="mt-6 space-y-3">
        {PRECHECK_ITEMS.map((item, i) => {
          const done = i < precheckIndex;
          const active = i === precheckIndex;
          const failed = failedIds.has(item.id) && active;
          return (
            <li
              key={item.id}
              className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${
                failed
                  ? 'border-danger/30 bg-danger/5'
                  : done
                    ? 'border-success/30 bg-success/5'
                    : active
                      ? 'border-primary/30 bg-primary-soft'
                      : 'border-border'
              }`}
            >
              {failed ? (
                <XCircle size={18} className="text-danger" />
              ) : done ? (
                <CheckCircle2 size={18} className="text-success" />
              ) : (
                <div className={`h-[18px] w-[18px] rounded-full border-2 ${active ? 'border-primary animate-pulse' : 'border-border'}`} />
              )}
              <div className="min-w-0 flex-1">
                <span className="text-sm">{item.label}</span>
                {active && item.kind === 'mic' && micListening && (
                  <p className="text-[11px] text-text-muted">Say “hello” to test your microphone…</p>
                )}
                {active && qualityDetail && !qualityFail && (
                  <p className="text-[11px] text-text-muted">{qualityDetail}</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {qualityFail && isQuality && (
        <div className="mt-4 rounded-xl border border-danger/30 bg-danger/5 p-3 text-left">
          <p className="text-sm font-medium text-danger">{qualityFail.title}</p>
          <p className="mt-1 text-xs text-text-muted">{qualityFail.guidance}</p>
          <Button className="mt-3 w-full" onClick={retest}>
            Re-test
          </Button>
        </div>
      )}
    </Screen>
  );
}

function FailureLayout({
  title,
  body,
  terminal,
  children,
}: {
  title: string;
  body: string;
  terminal?: boolean;
  children?: ReactNode;
}) {
  return (
    <Screen className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <Shield size={40} className={terminal ? 'text-danger' : 'text-warning'} />
      <h1 className="mt-4 text-lg font-semibold">{title}</h1>
      <p className="mt-2 max-w-xs text-sm text-text-muted">{body}</p>
      {children}
    </Screen>
  );
}

export function FailureVpnScreen() {
  const { setPhase, logEvent, setPrecheckIndex } = useCustomerJourney();
  return (
    <FailureLayout
      title="VPN or Proxy detected"
      body="Please disconnect from VPN, proxy, or public IP and try again."
    >
      <Button
        className="mt-6"
        onClick={() => {
          logEvent('Retry after VPN failure');
          setPrecheckIndex(0);
          setPhase('prechecks');
        }}
      >
        Retry
      </Button>
    </FailureLayout>
  );
}

export function FailureOutsideIndiaScreen() {
  return (
    <FailureLayout
      terminal
      title="Location not supported"
      body="Video KYC must be completed from within India. Your location or state PIN could not be verified."
    />
  );
}

export function FailureEkycExpiredScreen() {
  return (
    <FailureLayout
      terminal
      title="Aadhaar verification window lapsed"
      body="Your Aadhaar verification window has lapsed; please restart Aadhaar verification from your application."
    />
  );
}

export function FailureLinkExpiredScreen() {
  return (
    <FailureLayout
      terminal
      title="Link expired"
      body="This Video KYC link has expired. Request a new link from your application portal."
    />
  );
}

export function FailureBlacklistedScreen() {
  return (
    <FailureLayout
      terminal
      title="Unable to proceed"
      body="We cannot complete Video KYC at this time. Please contact SBM Bank customer support for assistance."
    />
  );
}

export function WaitingScreen() {
  const { setPhase, logEvent, checkEkycWindow } = useCustomerJourney();
  const [queuePos, setQueuePos] = useState(4);
  const [stage, setStage] = useState<'waiting' | 'ringing' | 'connected'>('waiting');
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (checkEkycWindow()) {
      setBlocked(true);
      return;
    }
    logEvent('Entered waiting queue');
  }, [logEvent, checkEkycWindow]);

  if (blocked) return null;

  useEffect(() => {
    if (stage !== 'waiting') return;
    const id = setInterval(() => {
      setQueuePos((p) => (p > 1 ? p - 1 : p));
    }, 2000);
    return () => clearInterval(id);
  }, [stage]);

  useEffect(() => {
    if (queuePos <= 1 && stage === 'waiting') {
      const t = setTimeout(() => setStage('ringing'), 1500);
      return () => clearTimeout(t);
    }
  }, [queuePos, stage]);

  useEffect(() => {
    if (stage !== 'ringing') return;
    logEvent('Ringing — connecting to bank official');
    const t = setTimeout(() => {
      setStage('connected');
      logEvent('Connected to bank official');
      setPhase('incall');
    }, 2500);
    return () => clearTimeout(t);
  }, [stage, setPhase, logEvent]);

  return (
    <Screen className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <div className="relative flex h-24 w-24 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-primary/20 pulse-soft" />
        <div className="breathe flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white">
          <Video size={28} />
        </div>
      </div>
      <h1 className="mt-6 text-lg font-semibold">
        {stage === 'ringing' ? 'Ringing…' : 'Connecting you to a bank official…'}
      </h1>
      {stage === 'waiting' && (
        <>
          <p className="mt-2 text-sm text-text-muted">Expected wait: under 2 minutes</p>
          <p className="mt-1 text-sm font-medium text-primary">Queue position: {queuePos}</p>
        </>
      )}
    </Screen>
  );
}

interface ChatMessage {
  id: string;
  from: 'agent' | 'customer';
  text: string;
}

export function InCallScreen({
  stream,
  simulated,
}: {
  stream: MediaStream | null;
  simulated: boolean;
}) {
  const {
    language,
    customerName,
    livenessCode,
    incallStepIndex,
    incallScriptIndex,
    phase,
    resumeFromReconnect,
    dismissSteppedAway,
    logEvent,
  } = useCustomerJourney();

  useInCallSimulation(phase === 'incall');

  useEffect(() => {
    if (phase !== 'reconnecting') return;
    const t = setTimeout(resumeFromReconnect, 2800);
    return () => clearTimeout(t);
  }, [phase, resumeFromReconnect]);

  const overlay = overlayForScriptIndex(incallScriptIndex);
  const agentUrl = getAvatarUrl({ id: AGENT_OFFICER.id, name: AGENT_OFFICER.name });

  const greeting =
    language === 'hi'
      ? COPY.agentGreeting.hi(customerName)
      : COPY.agentGreeting.en(customerName);

  const videoAreaRef = useRef<HTMLDivElement>(null);
  const { width: videoW, height: videoH } = useVideoContainerSize(videoAreaRef);
  const isCaptureGuide = overlay === 'face' || overlay === 'pan' || overlay === 'signature';

  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const panChatSent = useRef(false);

  useEffect(() => {
    if (overlay !== 'pan' || panChatSent.current) return;
    panChatSent.current = true;
    const text = 'Please hold your PAN closer';
    setMessages((prev) => [
      ...prev,
      { id: `agent-${Date.now()}`, from: 'agent', text },
    ]);
    logEvent(`Agent chat: ${text}`);
    setChatOpen(true);
  }, [overlay, logEvent]);

  const sendChat = () => {
    const text = chatInput.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      { id: `cust-${Date.now()}`, from: 'customer', text },
    ]);
    logEvent(`Customer chat: ${text}`);
    setChatInput('');
  };

  return (
    <div className="relative flex h-full min-h-[520px] flex-col bg-[#1A1523]">
      <div ref={videoAreaRef} className="absolute inset-0">
        <CameraPreview stream={stream} simulated={simulated} className="h-full w-full" customerName={customerName} />

        {isCaptureGuide && (
          <div className="pointer-events-none absolute inset-0 z-[5]">
            {overlay === 'face' && (
              <CaptureGuideOverlay kind="face" containerWidth={videoW} containerHeight={videoH}>
                <FaceCountdown onDone={() => undefined} />
              </CaptureGuideOverlay>
            )}
            {overlay === 'pan' && (
              <CaptureGuideOverlay
                kind="pan"
                containerWidth={videoW}
                containerHeight={videoH}
                successLabel={<PanCaptureLabel />}
              />
            )}
            {overlay === 'signature' && (
              <CaptureGuideOverlay
                kind="signature"
                containerWidth={videoW}
                containerHeight={videoH}
                successLabel={<SignatureCaptureLabel />}
              />
            )}
          </div>
        )}
      </div>

      <div className="relative z-10 bg-gradient-to-b from-black/70 to-transparent">
        <InCallStepper activeIndex={incallStepIndex} />
      </div>

      <div className="absolute right-3 top-14 z-10 w-24 overflow-hidden rounded-lg border-2 border-white/30 shadow-lg">
        <img src={agentUrl} alt="" className="aspect-square w-full object-cover" />
        <div className="bg-black/70 px-1.5 py-1 text-[8px] leading-tight text-white">
          <span className="font-medium">{AGENT_OFFICER.title}</span>
          <br />
          {AGENT_OFFICER.name}
          <span className="ml-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
        </div>
      </div>

      <div className="absolute left-3 top-14 z-10 flex gap-2">
        {language === 'hi' && (
          <span className="rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white">हिंदी</span>
        )}
        <span className="rounded-full bg-black/50 px-2 py-0.5 text-[10px] text-white">
          <Signal size={10} className="mr-1 inline" /> Good
        </span>
      </div>

      {/* Chat toggle — no mute / camera-off controls (SBM: bank controls session) */}
      <button
        type="button"
        onClick={() => setChatOpen((o) => !o)}
        className="absolute bottom-24 right-3 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-white shadow-lg"
        aria-label="Open chat"
      >
        <MessageCircle size={20} />
      </button>

      {chatOpen && (
        <div className="absolute inset-x-0 bottom-0 z-30 flex max-h-[55%] flex-col rounded-t-2xl border border-white/10 bg-[#1A1523]/95 pb-[env(safe-area-inset-bottom)] shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-white">Chat</p>
              <span className="rounded bg-white/15 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-white/80">
                Phase 2 preview
              </span>
            </div>
            <button type="button" onClick={() => setChatOpen(false)} className="rounded p-1 text-white/70 hover:bg-white/10">
              <X size={16} />
            </button>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto px-3 py-2">
            {messages.length === 0 && (
              <p className="text-center text-[11px] text-white/50">Messages with your verification officer appear here.</p>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[85%] rounded-lg px-2.5 py-1.5 text-xs ${
                  m.from === 'agent'
                    ? 'bg-white/15 text-white'
                    : 'ml-auto bg-primary text-white'
                }`}
              >
                <p className="mb-0.5 text-[9px] uppercase tracking-wide opacity-60">
                  {m.from === 'agent' ? 'Agent' : 'You'}
                </p>
                {m.text}
              </div>
            ))}
          </div>
          <div className="flex gap-2 border-t border-white/10 p-2">
            <input
              className="min-w-0 flex-1 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white placeholder:text-white/40"
              placeholder="Type a reply…"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') sendChat();
              }}
            />
            <button
              type="button"
              onClick={sendChat}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white"
              aria-label="Send"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Agent captions & capture overlays */}
      <div className="relative z-10 mt-auto space-y-2 p-3">
        {(overlay === 'greeting' || overlay === 'consent' || overlay === 'closing') && (
          <div className="rounded-lg bg-black/75 px-3 py-2 text-xs text-white">
            {overlay === 'greeting' && greeting}
            {overlay === 'consent' && 'Thank you. I confirm you have accepted our terms and this call is being recorded.'}
            {overlay === 'closing' && 'That completes your video KYC. Your verification will be reviewed shortly. Thank you!'}
          </div>
        )}

        {overlay === 'question' && (
          <div className="rounded-lg border border-primary/50 bg-black/80 px-3 py-2 text-sm text-white">
            {incallScriptIndex === 2 ? 'What is your occupation?' : 'What is your annual income?'}
            <p className="mt-1 text-[10px] text-white/60">Please answer aloud</p>
          </div>
        )}

        {overlay === 'code' && (
          <div className="rounded-lg bg-black/85 px-4 py-3 text-center text-white">
            <p className="text-xs">Please read the code on your screen</p>
            <p className="mt-2 font-mono text-3xl font-bold tracking-[0.3em]">{livenessCode}</p>
          </div>
        )}

        {overlay === 'location' && (
          <div className="flex items-center justify-center gap-2 rounded-lg bg-black/75 px-3 py-2 text-xs text-white">
            <MapPin size={16} className="text-primary animate-bounce" />
            Verifying your location…
          </div>
        )}

        {overlay === 'aadhaar' && (
          <div className="rounded-lg bg-success/90 px-3 py-2 text-center text-xs font-medium text-white">
            Aadhaar verified ✓
          </div>
        )}
      </div>

      {phase === 'reconnecting' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 px-6 text-center text-white">
          <Globe size={32} className="animate-pulse" />
          <p className="mt-4 font-semibold">Reconnecting…</p>
          <p className="mt-1 text-sm text-white/70">Please don&apos;t close this window</p>
        </div>
      )}

      {phase === 'stepped_away' && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/75 px-6 text-center text-white">
          <p className="font-semibold">Are you still there?</p>
          <p className="mt-2 text-sm text-white/70">The bank official is waiting for you.</p>
          <Button className="mt-4" onClick={dismissSteppedAway}>I&apos;m back</Button>
        </div>
      )}
    </div>
  );
}

function FaceCountdown({ onDone }: { onDone: () => void }) {
  const [n, setN] = useState(3);
  const [captured, setCaptured] = useState(false);

  useEffect(() => {
    if (n <= 0) {
      setCaptured(true);
      onDone();
      return;
    }
    const t = setTimeout(() => setN(n - 1), 1000);
    return () => clearTimeout(t);
  }, [n, onDone]);

  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {!captured ? (
        <span className="text-4xl font-bold text-white drop-shadow-lg">{n || '!'}</span>
      ) : (
        <span className="rounded-full bg-success px-3 py-1 text-sm font-medium text-white">Face captured ✓</span>
      )}
    </div>
  );
}

function PanCaptureLabel() {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDone(true), 2000);
    return () => clearTimeout(t);
  }, []);
  if (!done) return null;
  return <>PAN card captured successfully ✓</>;
}

function SignatureCaptureLabel() {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDone(true), 2000);
    return () => clearTimeout(t);
  }, []);
  if (!done) return null;
  return <>Signature captured ✓</>;
}

export function FeedbackScreen() {
  const { setPhase, setCsat, logEvent, csatComment } = useCustomerJourney();
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState(csatComment);

  const submit = (skipped = false) => {
    if (!skipped && rating) {
      setCsat(rating, comment);
      logEvent(`CSAT submitted: ${rating} stars`);
    } else {
      logEvent('CSAT skipped');
    }
    setPhase('completion');
  };

  return (
    <Screen>
      <h1 className="text-lg font-semibold text-text">How was your experience?</h1>
      <div className="mt-4 flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            className={`text-2xl ${rating && n <= rating ? 'text-warning' : 'text-border'}`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        className="mt-4 w-full rounded-lg border border-border p-2 text-sm"
        rows={3}
        placeholder="Optional comment"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />
      <div className="mt-4 flex flex-col gap-2">
        <Button className="w-full" onClick={() => submit(false)} disabled={!rating}>
          Submit
        </Button>
        <Button variant="ghost" className="w-full" onClick={() => submit(true)}>Skip</Button>
      </div>
    </Screen>
  );
}

export function CompletionScreen() {
  const { application, setPhase, logEvent } = useCustomerJourney();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    logEvent('Verification submitted — under review');
  }, [logEvent]);

  useEffect(() => {
    if (countdown <= 0) {
      setPhase('partner_return');
      return;
    }
    const t = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, setPhase]);

  return (
    <Screen className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <CheckCircle2 size={48} className="text-success" />
      <h1 className="mt-4 text-lg font-semibold">Verification submitted ✓</h1>
      <p className="mt-2 text-sm text-text-muted">
        Your KYC is under review; typically 24–48 hours.
      </p>
      <p className="mt-3 text-xs text-text-muted">Application reference: {application.appId}</p>
      <p className="mt-4 text-xs text-primary">Returning to your application in {countdown}s…</p>
    </Screen>
  );
}

export function PartnerReturnScreen() {
  const { application, restartJourney, setPhase, logEvent } = useCustomerJourney();

  const steps = [
    { label: 'Application details', status: 'done' as const },
    { label: 'KYC documents', status: 'done' as const },
    { label: 'Video KYC', detail: 'Submitted, under review (24–48 hrs)', status: 'current' as const },
    { label: 'Card issuance', detail: 'Pending', status: 'pending' as const },
  ];

  return (
    <div className="flex min-h-full flex-col bg-[#f4f6f8] text-[#1a2332]">
      <header className="shrink-0 bg-[#1e3a5f] px-4 py-3 text-white">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15">
            <Building2 size={20} />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">SBM Bank</p>
            <p className="text-[11px] text-white/75">Application Status</p>
          </div>
        </div>
      </header>

      <div className="flex-1 px-4 py-5">
        <div className="rounded-lg border border-[#d8dee6] bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-[#5c6b7a]">Application</p>
          <p className="mt-1 text-sm font-semibold">{application.productLabel}</p>
          <p className="mt-1 text-xs text-[#5c6b7a]">Ref: {application.appId}</p>
        </div>

        <ol className="mt-5 space-y-0">
          {steps.map((step, i) => (
            <li key={step.label} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                    step.status === 'done'
                      ? 'bg-[#2d7a4f] text-white'
                      : step.status === 'current'
                        ? 'border-2 border-[#1e3a5f] bg-white text-[#1e3a5f]'
                        : 'border border-[#c5cdd6] bg-white text-[#8a96a3]'
                  }`}
                >
                  {step.status === 'done' ? '✓' : i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div className={`my-1 w-0.5 flex-1 min-h-[24px] ${step.status === 'done' ? 'bg-[#2d7a4f]' : 'bg-[#d8dee6]'}`} />
                )}
              </div>
              <div className="pb-5 pt-0.5">
                <p className={`text-sm font-medium ${step.status === 'pending' ? 'text-[#8a96a3]' : 'text-[#1a2332]'}`}>
                  {step.label}
                  {step.status === 'done' && ' ✓'}
                </p>
                {step.detail && (
                  <p className="mt-0.5 text-xs text-[#5c6b7a]">{step.detail}</p>
                )}
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-2 text-xs text-[#5c6b7a]">
          You will be notified by SMS and email once verification completes.
        </p>
      </div>

      <footer className="shrink-0 border-t border-[#d8dee6] bg-white px-4 py-3">
        <p className="text-center text-[10px] text-[#8a96a3]">
          Sample screen — SMT application journey (illustrative)
        </p>
        <button
          type="button"
          className="mt-2 w-full text-center text-xs text-[#1e3a5f] underline underline-offset-2"
          onClick={() => {
            restartJourney();
            setPhase('landing');
            logEvent('Restart demo journey');
          }}
        >
          Restart demo journey
        </button>
      </footer>
    </div>
  );
}

export function ReattemptScreen() {
  const { application, setPhase, restartJourney, reattemptMode } = useCustomerJourney();
  const deadline = formatValidityRemaining(application.validityEndsAt - Date.now());

  if (!reattemptMode) return null;

  return (
    <Screen className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <Video size={40} className="text-warning" />
      <h1 className="mt-4 text-lg font-semibold">Something interrupted your KYC</h1>
      <p className="mt-2 text-sm text-text-muted">
        Resume anytime before {deadline}. Your application context is retained.
      </p>
      <Button
        className="mt-6"
        onClick={() => {
          restartJourney();
          setPhase('landing');
        }}
      >
        Resume Video KYC
      </Button>
    </Screen>
  );
}
