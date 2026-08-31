import { useCallback, useEffect, useRef, useState } from 'react';

export interface SectionRefresh {
  /** Increments on every refresh — feed into jittered live values. */
  nonce: number;
  /** True during the brief skeleton window right after a refresh. */
  refreshing: boolean;
  /** Ages over time: "Updated just now" → "Updated 2m ago". */
  caption: string;
  refresh: () => void;
}

function ageCaption(updatedAt: number, now: number): string {
  const sec = Math.floor((now - updatedAt) / 1000);
  if (sec < 45) return 'Updated just now';
  const min = Math.round(sec / 60);
  if (min < 60) return `Updated ${min}m ago`;
  const hr = Math.round(min / 60);
  return `Updated ${hr}h ago`;
}

/**
 * Per-section refresh state. Each Home card owns one of these so it can
 * re-roll its own live values without touching sibling cards or reloading.
 */
export function useSectionRefresh(): SectionRefresh {
  const [nonce, setNonce] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(() => Date.now());
  const [, setTick] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Age the "Updated…" caption on a slow tick.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const refresh = useCallback(() => {
    setRefreshing(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setNonce((n) => n + 1);
      setUpdatedAt(Date.now());
      setRefreshing(false);
    }, 400);
  }, []);

  return {
    nonce,
    refreshing,
    caption: ageCaption(updatedAt, Date.now()),
    refresh,
  };
}
