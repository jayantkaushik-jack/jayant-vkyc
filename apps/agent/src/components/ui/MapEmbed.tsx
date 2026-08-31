import { useEffect, useState } from 'react';
import { cn } from '@vkyc/shared/lib/cn';

interface MapEmbedProps {
  lat: number;
  lng: number;
  zoom?: number;
  className?: string;
}

function StaticMapFallback() {
  return (
    <div className="w-full h-full bg-gradient-to-br from-green-100 to-blue-100">
      <svg viewBox="0 0 400 220" className="w-full h-full" aria-hidden>
        <rect fill="#dce8f0" width="400" height="220" />
        <path d="M0 140 Q80 100 160 120 T320 110 L400 105 L400 220 L0 220Z" fill="#b8d4e8" opacity="0.6" />
        <path d="M40 160 L120 140 L200 150 L280 135 L360 145" stroke="#94a3b8" strokeWidth="8" fill="none" opacity="0.5" />
        <circle cx="205" cy="118" r="10" fill="#E5484D" stroke="white" strokeWidth="2" />
        <circle cx="205" cy="118" r="18" fill="none" stroke="#E5484D" strokeWidth="1" opacity="0.4" />
        <text x="220" y="112" fontSize="10" fill="#334155">SBM Lower Parel</text>
      </svg>
    </div>
  );
}

export function MapEmbed({ lat, lng, zoom = 16, className }: MapEmbedProps) {
  const [online, setOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // NOTE: keyless embed endpoint — fine for demo, use Maps Embed API + key for production
  const embedUrl = `https://maps.google.com/maps?q=${lat},${lng}&z=${zoom}&output=embed`;

  return (
    <div className={cn('relative overflow-hidden rounded-lg', className ?? 'h-[220px]')}>
      <div className="absolute inset-0 z-0">
        <StaticMapFallback />
      </div>

      {!online && (
        <span className="absolute top-2 left-2 z-20 inline-flex px-2 py-0.5 rounded text-xs font-medium bg-bg text-text-muted border border-border">
          Offline — static map
        </span>
      )}

      {online && (
        <iframe
          src={embedUrl}
          title="Customer location map"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="relative z-10 w-full h-full border-0"
        />
      )}
    </div>
  );
}
