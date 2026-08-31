import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CAPTURE_GUIDE_CAPTIONS, type CaptureMode } from '@vkyc/shared/lib/demoAssets';
import {
  buildGuideMaskDataUri,
  getGuideBoxPxRect,
  type PxRect,
} from '@vkyc/shared/lib/captureUtils';
import { cn } from '@vkyc/shared/lib/cn';

interface CaptureGuideOverlayProps {
  mode: Exclude<CaptureMode, null>;
  showAsset?: ReactNode;
  onContainerResize?: (width: number, height: number) => void;
}

export function CaptureGuideOverlay({ mode, showAsset, onContainerResize }: CaptureGuideOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rect, setRect] = useState<PxRect | null>(null);
  const [maskUri, setMaskUri] = useState<string>('');

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w === 0 || h === 0) return;
      const pxRect = getGuideBoxPxRect(w, h, mode);
      setRect(pxRect);
      setMaskUri(buildGuideMaskDataUri(w, h, pxRect, mode === 'face' ? 'face' : 'rect'));
      onContainerResize?.(w, h);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [mode, onContainerResize]);

  const caption = CAPTURE_GUIDE_CAPTIONS[mode];

  return (
    <div ref={containerRef} className="absolute inset-0 z-10 pointer-events-none">
      {rect && maskUri && (
        <>
          <div
            className="absolute inset-0 backdrop-blur-md bg-black/40"
            style={{
              WebkitMaskImage: maskUri,
              maskImage: maskUri,
              WebkitMaskSize: '100% 100%',
              maskSize: '100% 100%',
            }}
          />
          <div
            className={cn(
              'absolute border-2 border-dashed border-white/70 bg-transparent overflow-hidden flex items-center justify-center',
              mode === 'face' ? 'rounded-[50%]' : 'rounded-xl',
            )}
            style={{
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height,
            }}
          >
            {showAsset}
          </div>
        </>
      )}
      <p className="absolute bottom-28 left-0 right-0 text-center text-white/90 text-sm z-20">
        {caption}
      </p>
    </div>
  );
}
