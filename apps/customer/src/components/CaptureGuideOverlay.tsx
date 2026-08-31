import { useEffect, useState, type ReactNode } from 'react';
import {
  type CaptureGuideKind,
  captionTop,
  computeGuideRect,
} from '@customer/features/customer/captureGuideGeometry';

const CAPTIONS: Record<Exclude<CaptureGuideKind, 'face'>, string> = {
  pan: 'Hold your PAN card inside the frame',
  signature: 'Sign on white paper and hold it up',
};

interface CaptureGuideOverlayProps {
  kind: CaptureGuideKind;
  containerWidth: number;
  containerHeight: number;
  children?: ReactNode;
  successLabel?: ReactNode;
}

export function CaptureGuideOverlay({
  kind,
  containerWidth,
  containerHeight,
  children,
  successLabel,
}: CaptureGuideOverlayProps) {
  if (containerWidth <= 0 || containerHeight <= 0) return null;

  const rect = computeGuideRect(containerWidth, containerHeight, kind);
  const isFace = kind === 'face';
  const caption = !isFace ? CAPTIONS[kind] : null;
  const captionY = captionTop(rect);

  return (
    <>
      <div
        className={`absolute border-4 ${isFace ? 'rounded-[50%] border-white/80' : kind === 'signature' ? 'rounded-lg border-dashed border-white' : 'rounded-lg border-white'}`}
        style={{
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
        }}
      >
        {children}
      </div>
      {caption && (
        <p
          className="absolute left-0 right-0 px-4 text-center text-[11px] text-white"
          style={{ top: captionY }}
        >
          {caption}
        </p>
      )}
      {successLabel && (
        <div
          className="absolute left-0 right-0 px-4 text-center text-[11px] font-medium text-success"
          style={{ top: captionY + (caption ? 20 : 0) }}
        >
          {successLabel}
        </div>
      )}
    </>
  );
}

/** Observe video container size for guide geometry. */
export function useVideoContainerSize(ref: React.RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      setSize({ width: el.clientWidth, height: el.clientHeight });
    };
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return size;
}
