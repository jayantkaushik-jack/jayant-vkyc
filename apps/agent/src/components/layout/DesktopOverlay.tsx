import { Monitor } from 'lucide-react';
import { useEffect, useState } from 'react';

export function DesktopOverlay() {
  const [narrow, setNarrow] = useState(window.innerWidth < 1024);

  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth < 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  if (!narrow) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-brand-950/95 flex flex-col items-center justify-center text-white p-8 text-center">
      <Monitor size={48} className="mb-4 opacity-80" />
      <h2 className="text-xl font-semibold mb-2">Best viewed on desktop</h2>
      <p className="text-white/70 max-w-md">
        The Cashfree Video KYC demo is optimized for screens 1280px and wider. Please switch to a desktop device for the full experience.
      </p>
    </div>
  );
}
