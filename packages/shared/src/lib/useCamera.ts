import { useCallback, useEffect, useRef, useState } from 'react';

export type CameraStatus = 'idle' | 'requesting' | 'active' | 'denied' | 'unavailable';

export function useCamera() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>('idle');
  const streamRef = useRef<MediaStream | null>(null);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
    setStatus('idle');
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unavailable');
      return null;
    }
    if (streamRef.current) {
      setStatus('active');
      return streamRef.current;
    }
    setStatus('requesting');
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: false,
      });
      streamRef.current = media;
      setStream(media);
      setStatus('active');
      return media;
    } catch {
      setStatus('denied');
      return null;
    }
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { stream, status, start, stop };
}

export {
  captureVideoFrame,
  getNormalizedCrop,
  getGuideBoxStyle,
  cropPanPhotoFromCard,
  cropImageToGuide,
  type CropRect,
} from './captureUtils';
