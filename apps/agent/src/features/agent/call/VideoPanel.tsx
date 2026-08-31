import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  Mic, MicOff, Video, VideoOff, PhoneOff, MoreVertical, RefreshCw,
  MapPin, MessageSquare, AlertTriangle,
} from 'lucide-react';
import { Button } from '@agent/components/ui/Button';
import { StatusPill, networkVariant } from '@agent/components/ui/StatusPill';
import { Modal, ModalFooter } from '@agent/components/ui/Modal';
import { MapEmbed } from '@agent/components/ui/MapEmbed';
import { RejectionReasonPicker, hasRejectionSelection } from '@agent/components/call/RejectionReasonPicker';
import { formatDuration } from '@vkyc/shared/lib/format';
import { DEMO_ASSETS, type CaptureMode } from '@vkyc/shared/lib/demoAssets';
import {
  captureVideoFrame,
  getNormalizedCrop,
  cropImageToGuide,
} from '@vkyc/shared/lib/captureUtils';
import { checkGeoFence, formatGeoFencePassBasis } from '@vkyc/shared/lib/geoFence';
import { useAdminConfig } from '@vkyc/shared/data';
import { CaptureGuideOverlay } from '@agent/features/agent/call/CaptureGuideOverlay';
import { useCallFlow } from '@agent/features/agent/call/CallFlowContext';
import type { CameraStatus } from '@vkyc/shared/lib/useCamera';
import type { SelectedRejectionReasons } from '@vkyc/shared/lib/rejectionReasons';
import type { CallSession } from '@vkyc/shared/data/types';
import { cn } from '@vkyc/shared/lib/cn';

const NETWORK_CYCLE = ['Strong', 'Average', 'Weak'] as const;

interface VideoPanelProps {
  session: CallSession;
  livenessCode?: string;
  captureMode: CaptureMode | null;
  cameraStream: MediaStream | null;
  cameraStatus: CameraStatus;
  captureNonce: number;
  onCapture: (image: string) => void;
  onEndCall?: () => void;
}

type MenuPanel = 'menu' | 'location' | 'mark-choice' | 'mark-reasons' | null;
type MarkDecision = 'unable' | 'rejected';

function addressWithFallbackCoords(
  addr: CallSession['customer']['currentAddress'],
  live: { lat: number; lng: number },
  distanceKm: number,
) {
  if (addr.lat != null && addr.lng != null) return addr;
  const deg = distanceKm / 111;
  return { ...addr, lat: live.lat + deg * 0.65, lng: live.lng + deg * 0.35 };
}

export function VideoPanel({
  session,
  livenessCode,
  captureMode,
  cameraStream,
  cameraStatus,
  captureNonce,
  onCapture,
  onEndCall,
}: VideoPanelProps) {
  const flow = useCallFlow();
  const adminConfig = useAdminConfig();
  const videoRef = useRef<HTMLVideoElement>(null);
  const pipRef = useRef<HTMLVideoElement>(null);
  const containerSizeRef = useRef({ w: 0, h: 0 });
  const lastCaptureNonce = useRef(0);
  const [timer, setTimer] = useState(0);
  const [networkIdx, setNetworkIdx] = useState(0);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [panel, setPanel] = useState<MenuPanel>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [markDecision, setMarkDecision] = useState<MarkDecision>('unable');
  const [markReasons, setMarkReasons] = useState<SelectedRejectionReasons>({ selections: [], remarks: '' });
  const [endCallModalOpen, setEndCallModalOpen] = useState(false);
  const [showMute, setShowMute] = useState(false);
  const [flash, setFlash] = useState(false);
  const [showPanAsset, setShowPanAsset] = useState(false);
  const [showSignAsset, setShowSignAsset] = useState(false);
  const [wobble, setWobble] = useState(false);
  const [chatDraft, setChatDraft] = useState('');

  const isLive = cameraStatus === 'active' && !!cameraStream;
  const network = NETWORK_CYCLE[networkIdx];
  const vbUrl = adminConfig.virtualBackground.activeUrl;
  const displayTimer = flow.finalDurationSec ?? timer;

  const liveLatLng = useMemo(
    () => ({ lat: session.location.lat, lng: session.location.lng }),
    [session.location.lat, session.location.lng],
  );

  const geoResult = useMemo(() => {
    const current = addressWithFallbackCoords(
      session.customer.currentAddress,
      liveLatLng,
      session.location.distanceCurrentKm,
    );
    const permanent = addressWithFallbackCoords(
      session.customer.permanentAddress,
      liveLatLng,
      session.location.distancePermanentKm,
    );
    return checkGeoFence(liveLatLng, { current, permanent }, adminConfig.thresholds);
  }, [session.customer, session.location, liveLatLng, adminConfig.thresholds]);

  const reverseAddress = useMemo(() => {
    const loc = session.location;
    return (
      loc.address ??
      `${loc.area ?? 'Area'}, ${loc.city}, ${loc.state} - ${loc.pincode} (PIN ${geoResult.livePin})`
    );
  }, [session.location, geoResult.livePin]);

  const handleContainerResize = useCallback((w: number, h: number) => {
    containerSizeRef.current = { w, h };
  }, []);

  useEffect(() => {
    if (flow.sessionEnded) return;
    const id = setInterval(() => setTimer((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [flow.sessionEnded]);

  useEffect(() => {
    const id = setInterval(() => setNetworkIdx((i) => (i + 1) % 3), 4000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setShowMute((s) => !s), 8000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const bind = (el: HTMLVideoElement | null) => {
      if (el && cameraStream) {
        el.srcObject = cameraStream;
        el.play().catch(() => {});
      }
    };
    bind(videoRef.current);
    bind(pipRef.current);
  }, [cameraStream]);

  useEffect(() => {
    setShowPanAsset(false);
    setShowSignAsset(false);
    if (!captureMode || isLive) return;

    const delay = setTimeout(() => {
      if (captureMode === 'pan') {
        setShowPanAsset(true);
        setWobble(true);
      } else if (captureMode === 'sign') {
        setShowSignAsset(true);
        setWobble(true);
      }
    }, 1500);
    return () => clearTimeout(delay);
  }, [captureMode, isLive]);

  const performCapture = useCallback(async () => {
    setFlash(true);
    setTimeout(() => setFlash(false), 200);

    const { w: cw, h: ch } = containerSizeRef.current;

    if (isLive && videoRef.current && captureMode) {
      const vw = videoRef.current.videoWidth;
      const vh = videoRef.current.videoHeight;
      const crop = getNormalizedCrop(
        captureMode,
        vw,
        vh,
        cw > 0 ? cw : vw,
        ch > 0 ? ch : vh,
      );
      const dataUrl = captureVideoFrame(videoRef.current, crop, 0.9, false);
      if (dataUrl) {
        onCapture(dataUrl);
        return;
      }
    }

    if (captureMode === 'face') onCapture(DEMO_ASSETS.faceLive);
    else if (captureMode === 'pan') {
      const cropped = await cropImageToGuide(DEMO_ASSETS.panCard, 'pan', cw || undefined, ch || undefined);
      onCapture(cropped);
    } else if (captureMode === 'sign') {
      const cropped = await cropImageToGuide(DEMO_ASSETS.signPaper, 'sign', cw || undefined, ch || undefined);
      onCapture(cropped);
    }
  }, [captureMode, isLive, onCapture]);

  useEffect(() => {
    if (captureNonce <= lastCaptureNonce.current) return;
    lastCaptureNonce.current = captureNonce;
    performCapture();
  }, [captureNonce, performCapture]);

  const openLocation = () => {
    setPanel('location');
    flow.logActivity('Viewed customer live location');
  };

  const openMarkStatus = () => {
    setMarkReasons({ selections: [], remarks: '' });
    setPanel('mark-choice');
  };

  const confirmMarkStatus = () => {
    if (!hasRejectionSelection(markReasons) && !markReasons.remarks) return;
    flow.setRejectionReasons(markReasons);
    flow.submitDecision(markDecision, markReasons);
    setPanel(null);
  };

  const codeDigits = livenessCode?.replace(/\s/g, '').split('') ?? [];

  const guideAsset =
    showPanAsset && captureMode === 'pan' ? (
      <img
        src={DEMO_ASSETS.panCard}
        alt="PAN"
        className={cn(
          'max-w-[92%] max-h-[88%] object-contain animate-[slideUp_0.6s_ease-out]',
          wobble && 'animate-[wobble_2s_ease-in-out_infinite]',
        )}
      />
    ) : showSignAsset && captureMode === 'sign' ? (
      <img
        src={DEMO_ASSETS.signPaper}
        alt="Signature"
        className={cn(
          'max-w-[92%] max-h-[88%] object-contain animate-[slideUp_0.6s_ease-out]',
          wobble && 'animate-[wobble_2s_ease-in-out_infinite]',
        )}
      />
    ) : null;

  const geoPassBasis = formatGeoFencePassBasis(geoResult);

  return (
    <>
      <div className="relative bg-brand-950 rounded-xl overflow-hidden flex flex-col h-full min-h-[500px]">
        {!isLive && (
          <div className="absolute inset-0">
            <img
              src={DEMO_ASSETS.customerVideo}
              alt=""
              className="w-full h-full object-cover opacity-80"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-brand-950/40 via-transparent to-brand-950/60" />
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={cn(
            'absolute inset-0 w-full h-full object-cover',
            (!isLive || cameraOff) && 'opacity-0 pointer-events-none',
          )}
        />

        {flash && <div className="absolute inset-0 bg-white z-30 pointer-events-none animate-pulse" />}

        <div className="relative z-10 flex items-center justify-between p-4">
          <div className="flex items-center gap-2">
            <StatusPill label={network} variant={networkVariant(network)} />
            <StatusPill
              label={isLive ? 'Live camera' : 'Simulated'}
              variant={isLive ? 'passed' : 'pending'}
            />
            {flow.sessionEnded && (
              <StatusPill label="Session ended" variant="pending" />
            )}
          </div>
          <span className="text-white/80 text-sm font-mono">{formatDuration(displayTimer)}</span>
        </div>

        {showMute && (
          <div className="relative z-10 mx-4 px-3 py-2 bg-black/40 rounded-lg text-white/90 text-sm text-center">
            «{session.customer.name.split(' ')[0]}» is on mute
          </div>
        )}

        {captureMode && (
          <CaptureGuideOverlay
            mode={captureMode}
            showAsset={guideAsset}
            onContainerResize={handleContainerResize}
          />
        )}

        {livenessCode && codeDigits.length > 0 && !captureMode && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex gap-2 z-10 flex-wrap justify-center max-w-[90%]">
            {codeDigits.map((d, i) => (
              <span
                key={i}
                className="w-10 h-12 bg-white/10 backdrop-blur rounded-lg flex items-center justify-center text-white text-xl font-bold border border-white/20"
              >
                {d}
              </span>
            ))}
          </div>
        )}

        <div
          className="absolute bottom-20 right-4 w-28 h-20 rounded-lg border border-white/20 overflow-hidden z-10"
          style={
            vbUrl
              ? { backgroundImage: `url(${vbUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
              : undefined
          }
        >
          {!vbUrl && <div className="absolute inset-0 bg-black/60" />}
          <video
            ref={pipRef}
            autoPlay
            muted
            playsInline
            className={cn(
              'absolute inset-0 w-full h-full object-cover',
              !isLive && 'hidden',
              vbUrl && 'rounded-full origin-center',
            )}
            style={{ transform: vbUrl ? 'scaleX(-1) scale(0.72)' : 'scaleX(-1)' }}
          />
          {!isLive && (
            <div className="absolute inset-0 flex items-center justify-center">
              {vbUrl ? (
                <span className="w-12 h-12 rounded-full bg-white/25 border border-white/40 flex items-center justify-center text-white/90 text-[10px] font-medium">
                  Agent
                </span>
              ) : (
                <span className="text-white/60 text-xs">Agent PIP</span>
              )}
            </div>
          )}
        </div>

        <div className="relative z-10 mt-auto flex items-center justify-center gap-3 p-4 bg-black/30">
          <Button variant="ghost" size="sm" className="text-white/80 hover:bg-white/10">
            <RefreshCw size={16} /> Reconnect
          </Button>
          <button
            type="button"
            onClick={() => setPanel((p) => (p === 'menu' ? null : 'menu'))}
            className="p-2 rounded-lg text-white/80 hover:bg-white/10 relative"
            aria-label="More options"
          >
            <MoreVertical size={18} />
          </button>
          <button
            type="button"
            onClick={() => setChatOpen(true)}
            className="p-2 rounded-lg text-white/80 hover:bg-white/10"
            aria-label="Chat"
            title="Chat (Phase 2 preview)"
          >
            <MessageSquare size={18} />
          </button>
          <button
            type="button"
            onClick={() => setMuted(!muted)}
            className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            {muted ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
          <button
            type="button"
            onClick={() => setCameraOff(!cameraOff)}
            className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            {cameraOff ? <VideoOff size={18} /> : <Video size={18} />}
          </button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setEndCallModalOpen(true)}
            disabled={flow.sessionEnded}
          >
            <PhoneOff size={16} /> End Call
          </Button>
        </div>

        {panel === 'menu' && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40 w-64 rounded-lg border border-white/15 bg-brand-950/95 shadow-lg overflow-hidden">
            <button
              type="button"
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-white/90 hover:bg-white/10 text-left"
              onClick={openLocation}
            >
              <MapPin size={14} /> View customer location
            </button>
            <button
              type="button"
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-white/90 hover:bg-white/10 text-left border-t border-white/10"
              onClick={openMarkStatus}
              disabled={flow.sessionEnded}
            >
              <AlertTriangle size={14} /> Mark as issue
            </button>
          </div>
        )}
      </div>

      <Modal
        open={panel === 'location'}
        onClose={() => setPanel(null)}
        title="Customer live location"
        size="lg"
      >
        <div className="space-y-3 text-sm">
          <MapEmbed lat={liveLatLng.lat} lng={liveLatLng.lng} zoom={15} className="h-48 w-full rounded-lg" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-text-muted">Latitude</p>
              <p className="font-mono">{liveLatLng.lat.toFixed(6)}</p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Longitude</p>
              <p className="font-mono">{liveLatLng.lng.toFixed(6)}</p>
            </div>
          </div>
          <div>
            <p className="text-xs text-text-muted">Reverse-geocoded address</p>
            <p>{reverseAddress}</p>
          </div>
          <div className="rounded-lg border border-border p-3 space-y-1">
            <p className="font-medium text-xs uppercase tracking-wide text-text-muted">Geo-fence</p>
            <p className="font-medium text-success">{geoPassBasis}</p>
            <p className="text-xs text-text-muted">{geoResult.message}</p>
            <p className="text-xs">
              Distance to current: {(geoResult.distanceCurrentKm ?? session.location.distanceCurrentKm).toFixed(1)} km
              {' · '}
              permanent: {(geoResult.distancePermanentKm ?? session.location.distancePermanentKm).toFixed(1)} km
            </p>
            <p className="text-xs text-text-muted">Live PIN: {geoResult.livePin}</p>
          </div>
        </div>
      </Modal>

      <Modal
        open={panel === 'mark-choice'}
        onClose={() => setPanel(null)}
        title="Mark as issue"
        size="md"
      >
        <p className="text-sm text-text-muted mb-4">
          Choose how to close this session. You will select a reason next.
        </p>
        <div className="flex flex-col gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              setMarkDecision('unable');
              setMarkReasons({ selections: [], remarks: '' });
              setPanel('mark-reasons');
            }}
          >
            Unable to Verify
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              setMarkDecision('rejected');
              setMarkReasons({ selections: [], remarks: '' });
              setPanel('mark-reasons');
            }}
          >
            Rejected
          </Button>
        </div>
      </Modal>

      <Modal
        open={panel === 'mark-reasons'}
        onClose={() => setPanel(null)}
        title={markDecision === 'rejected' ? 'Rejection reason' : 'Unable to verify — reason'}
        size="lg"
        footer={
          <ModalFooter
            onCancel={() => setPanel('mark-choice')}
            onConfirm={confirmMarkStatus}
            cancelLabel="Back"
            confirmLabel="Confirm & End Session"
            confirmVariant="destructive"
          />
        }
      >
        <RejectionReasonPicker
          selected={markReasons}
          onChange={setMarkReasons}
          decisionFilter={markDecision === 'rejected' ? 'rejected' : 'unable'}
        />
      </Modal>

      <Modal
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        title="In-call chat"
        size="md"
      >
        <div className="space-y-3">
          <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-bg text-text-muted border border-border">
            Phase 2 preview
          </span>
          <div className="h-56 overflow-y-auto space-y-2 rounded-lg border border-border p-3 bg-bg">
            {flow.chatMessages.length === 0 && (
              <p className="text-xs text-text-muted text-center py-8">No messages yet. Say hello to the customer.</p>
            )}
            {flow.chatMessages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                  m.from === 'agent'
                    ? 'ml-auto bg-primary text-white'
                    : 'mr-auto bg-white border border-border text-text',
                )}
              >
                {m.text}
              </div>
            ))}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              flow.sendChatMessage(chatDraft);
              setChatDraft('');
            }}
          >
            <input
              value={chatDraft}
              onChange={(e) => setChatDraft(e.target.value)}
              placeholder="Type a message…"
              className="flex-1 px-3 py-2 rounded-lg border border-border text-sm"
            />
            <Button type="submit" size="sm" disabled={!chatDraft.trim()}>Send</Button>
          </form>
        </div>
      </Modal>

      <Modal
        open={endCallModalOpen}
        onClose={() => setEndCallModalOpen(false)}
        title="End the call with the customer?"
        size="md"
        footer={
          <ModalFooter
            onCancel={() => setEndCallModalOpen(false)}
            onConfirm={() => {
              onEndCall?.();
              setEndCallModalOpen(false);
            }}
            confirmLabel="End Call"
            confirmVariant="destructive"
          />
        }
      >
        <p className="text-sm text-text-muted">
          This disconnects the customer. The call recording stops here and the call time is locked.
          You&apos;ll stay on this screen to review the report and submit your decision.
        </p>
      </Modal>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes wobble {
          0%, 100% { transform: rotate(-0.5deg); }
          50% { transform: rotate(0.5deg); }
        }
      `}</style>
    </>
  );
}
