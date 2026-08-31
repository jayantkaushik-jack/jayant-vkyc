import { useEffect, useState } from 'react';

/** Live break timer in seconds — ticks while active and breakStartedAt is set. */
export function useBreakTimer(breakStartedAt: number | null, active: boolean): number {
  const [sec, setSec] = useState(0);

  useEffect(() => {
    if (!active || !breakStartedAt) {
      setSec(0);
      return;
    }
    const tick = () => setSec(Math.floor((Date.now() - breakStartedAt) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [breakStartedAt, active]);

  return sec;
}
