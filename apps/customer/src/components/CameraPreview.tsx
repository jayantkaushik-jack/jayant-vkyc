import { useEffect, useRef } from 'react';
import { getAvatarUrl } from '@vkyc/shared/lib/avatar';

interface CameraPreviewProps {
  stream: MediaStream | null;
  simulated: boolean;
  className?: string;
  customerName?: string;
}

export function CameraPreview({ stream, simulated, className = '', customerName = 'Customer' }: CameraPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    void video.play().catch(() => undefined);
  }, [stream]);

  if (simulated || !stream) {
    return (
      <div className={`relative overflow-hidden bg-[#1A1523] ${className}`}>
        <img
          src={getAvatarUrl({ id: 'customer-self', name: customerName })}
          alt=""
          className="h-full w-full object-cover opacity-90"
        />
        <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
          Simulated camera
        </span>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className={`object-cover ${className}`}
    />
  );
}
