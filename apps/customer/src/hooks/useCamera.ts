import { useCallback, useEffect, useRef, useState } from 'react';

export function useCamera() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [denied, setDenied] = useState(false);
  const [simulated, setSimulated] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  const request = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setDenied(true);
      setSimulated(true);
      return false;
    }
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = media;
      setStream(media);
      setDenied(false);
      setSimulated(false);
      return true;
    } catch {
      setDenied(true);
      setSimulated(true);
      setStream(null);
      return false;
    }
  }, []);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setStream(null);
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { stream, denied, simulated, request, stop, setSimulated };
}
