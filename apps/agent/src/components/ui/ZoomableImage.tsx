import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { X, ZoomIn, ZoomOut } from 'lucide-react';
import { cn } from '@vkyc/shared/lib/cn';

interface ZoomableImageProps {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
}

/** Click-to-zoom lightbox with scroll/pinch zoom (up to 4×) and pan. */
export function ZoomableImage({ src, alt, className, imgClassName }: ZoomableImageProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn('relative group block cursor-zoom-in', className)}
        aria-label={`Zoom ${alt}`}
      >
        <img src={src} alt={alt} className={cn(imgClassName)} />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/25">
          <ZoomIn size={18} className="text-white opacity-0 drop-shadow group-hover:opacity-100" />
        </span>
      </button>
      {open && <ImageLightbox src={src} alt={alt} onClose={() => setOpen(false)} />}
    </>
  );
}

function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const pinchStart = useRef<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const clampScale = (s: number) => Math.min(4, Math.max(1, s));

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setScale((s) => clampScale(s + (e.deltaY < 0 ? 0.15 : -0.15)));
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    last.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || scale <= 1) return;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    last.current = { x: e.clientX, y: e.clientY };
    setOffset((o) => ({ x: o.x + dx, y: o.y + dy }));
  };

  const onPointerUp = () => {
    dragging.current = false;
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStart.current = Math.hypot(dx, dy);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStart.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const ratio = dist / pinchStart.current;
      setScale((s) => clampScale(s * ratio));
      pinchStart.current = dist;
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85"
      role="dialog"
      aria-modal
      aria-label={alt}
      onClick={onClose}
    >
      <div className="absolute right-4 top-4 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="rounded-lg bg-white/15 p-2 text-white hover:bg-white/25"
          onClick={() => setScale((s) => clampScale(s - 0.25))}
          aria-label="Zoom out"
        >
          <ZoomOut size={18} />
        </button>
        <button
          type="button"
          className="rounded-lg bg-white/15 p-2 text-white hover:bg-white/25"
          onClick={() => setScale((s) => clampScale(s + 0.25))}
          aria-label="Zoom in"
        >
          <ZoomIn size={18} />
        </button>
        <button
          type="button"
          className="rounded-lg bg-white/15 p-2 text-white hover:bg-white/25"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={18} />
        </button>
      </div>
      <div
        className="max-h-[90vh] max-w-[90vw] touch-none overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="max-h-[90vh] max-w-[90vw] select-none object-contain"
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            cursor: scale > 1 ? 'grab' : 'default',
          }}
        />
      </div>
      <p className="absolute bottom-4 text-xs text-white/70">{Math.round(scale * 100)}% · scroll or pinch to zoom</p>
    </div>
  );
}

export function ZoomableImageSlot({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
