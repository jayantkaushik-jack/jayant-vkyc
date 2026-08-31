import { useEffect, useState } from 'react';
import { Pause, Play } from 'lucide-react';
import { formatDuration } from '../../lib/format';
import { getAvatarUrl } from '../../lib/avatar';
import type { Agent, Customer } from '../../data/types';

interface CallRecordingPlayerProps {
  customer: Customer;
  agent?: Agent | null;
  timestamp?: string;
  durationSec: number;
}

export function CallRecordingPlayer({ customer, agent, timestamp, durationSec }: CallRecordingPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setElapsed((e) => {
        if (e >= durationSec) {
          setPlaying(false);
          return durationSec;
        }
        return e + 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [playing, durationSec]);

  const progress = durationSec > 0 ? (elapsed / durationSec) * 100 : 0;
  const tsLabel = timestamp ? new Date(timestamp).toLocaleString('en-IN') : new Date().toLocaleString('en-IN');

  return (
    <div className="rounded-xl overflow-hidden bg-brand-950 aspect-video relative">
      <RecordingPoster customer={customer} agent={agent ?? null} timestampLabel={tsLabel} />
      <div className="absolute bottom-0 left-0 right-0 bg-black/70 p-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (elapsed >= durationSec) setElapsed(0);
              setPlaying((p) => !p);
            }}
            className="p-2 rounded-full bg-white/15 text-white hover:bg-white/25"
          >
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <div className="flex-1 h-1.5 bg-white/25 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-white text-xs font-mono tabular-nums">
            {formatDuration(elapsed)} / {formatDuration(durationSec)}
          </span>
        </div>
      </div>
    </div>
  );
}

function RecordingPoster({
  customer,
  agent,
  timestampLabel,
}: {
  customer: Customer;
  agent: Agent | null;
  timestampLabel: string;
}) {
  // Poster-only: illustrated DiceBear avatar placeholder — not the photographic in-call feed.
  // Live-call simulation, capture pipeline, and KYC report crops still use demoAssets elsewhere.
  const pipUrl = agent ? getAvatarUrl({ id: agent.id, name: agent.name }) : null;
  const customerAvatarUrl = getAvatarUrl({
    id: customer.id,
    name: customer.name,
    gender: customer.gender,
  });

  return (
    <div className="absolute inset-0 bg-brand-950">
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
        <div className="w-24 h-24 rounded-full bg-white/10 ring-2 ring-white/20 overflow-hidden flex items-center justify-center">
          <img
            src={customerAvatarUrl}
            alt=""
            className="w-[96px] h-[96px] object-cover"
          />
        </div>
        <p className="text-sm text-white/60 font-medium">{customer.name}</p>
      </div>
      <div className="absolute top-3 left-3 px-2 py-0.5 rounded-full bg-green-500/90 text-white text-[10px] font-semibold">
        Strong
      </div>
      <div className="absolute top-3 right-3 px-2 py-0.5 rounded bg-black/55 text-white text-[10px]">
        {timestampLabel}
      </div>
      <div className="absolute right-4 bottom-16 w-24 h-16 rounded-md overflow-hidden border border-white/50 bg-black/50">
        {pipUrl ? (
          <img src={pipUrl} alt={agent?.name ?? 'Agent'} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/70 text-xs">Agent</div>
        )}
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-14 h-14 rounded-full bg-black/50 border border-white/30 flex items-center justify-center">
          <Play size={22} className="text-white ml-0.5" />
        </div>
      </div>
    </div>
  );
}
