import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, ModalFooter } from '@agent/components/ui/Modal';
import { StatusPill, networkVariant } from '@agent/components/ui/StatusPill';
import { useAgent } from '@agent/features/agent/AgentContext';

interface DeviceCheckModalProps {
  open: boolean;
  onClose: () => void;
}

export function DeviceCheckModal({ open, onClose }: DeviceCheckModalProps) {
  const navigate = useNavigate();
  const { setStatus, startCamera, cameraStream, cameraStatus } = useAgent();
  const [devices, setDevices] = useState<{ video: MediaDeviceInfo[]; audio: MediaDeviceInfo[] }>({
    video: [],
    audio: [],
  });

  useEffect(() => {
    if (!open) return;
    startCamera();
  }, [open, startCamera]);

  useEffect(() => {
    if (cameraStatus !== 'active') return;
    navigator.mediaDevices.enumerateDevices().then((all) => {
      setDevices({
        video: all.filter((d) => d.kind === 'videoinput'),
        audio: all.filter((d) => d.kind === 'audioinput'),
      });
    });
  }, [cameraStatus]);

  const handleGoOnline = () => {
    setStatus('online');
    onClose();
    navigate('/agent/queue');
  };

  const cameraUnavailable = cameraStatus === 'denied' || cameraStatus === 'unavailable';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Device Check"
      size="lg"
      footer={
        <ModalFooter
          onCancel={onClose}
          onConfirm={handleGoOnline}
          confirmLabel="Go Online"
        />
      }
    >
      <div className="space-y-4">
        <div className="relative bg-brand-950 rounded-xl aspect-video flex items-center justify-center overflow-hidden">
          {cameraStream && cameraStatus === 'active' ? (
            <video
              autoPlay
              muted
              playsInline
              ref={(el) => {
                if (el && cameraStream) {
                  el.srcObject = cameraStream;
                  el.play().catch(() => {});
                }
              }}
              className="w-full h-full object-cover"
            />
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-br from-brand-950 via-primary/40 to-brand-950 animate-pulse" />
              <span className="relative text-white/60 text-sm">Webcam Preview</span>
            </>
          )}
          <div className="absolute top-3 left-3">
            <StatusPill label="Strong" variant={networkVariant('Strong')} />
          </div>
          {cameraUnavailable && (
            <div className="absolute bottom-3 left-3 right-3 px-3 py-2 bg-warning/90 text-white text-xs rounded-lg">
              Camera unavailable — demo will use simulated video
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Microphone', list: devices.audio, fallback: 'Default — Microphone' },
            { label: 'Speaker', list: [], fallback: 'Default — Speaker' },
            { label: 'Camera', list: devices.video, fallback: 'Default — Camera' },
          ].map(({ label, list, fallback }) => (
            <div key={label}>
              <label className="block text-xs text-text-muted mb-1">{label}</label>
              <select className="w-full px-3 py-2 rounded-lg border border-border text-sm bg-surface">
                {list.length > 0
                  ? list.map((d) => (
                      <option key={d.deviceId}>{d.label || fallback}</option>
                    ))
                  : <option>{fallback}</option>}
              </select>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

