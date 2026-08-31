/**
 * Round 24 (§2 tier 2, §8) — interface slot only. Per the handoff: GCP
 * Speech-to-Text is blocked on Cashfree IT's SSL-inspecting proxy as of
 * this round, so there is no key and nothing to test against yet. This
 * file exists so the orchestrating hook's priority order (ElevenLabs → GCP
 * → Web Speech) has a real second tier to call once that unblocks, without
 * needing to touch the hook itself — `connectGcp()` always resolves `null`
 * today, which the hook reads as "not configured, fall through."
 */
export interface GcpConnectOptions {
  languageCode: string;
  onPartialTranscript: (text: string) => void;
  onCommittedTranscript: (text: string) => void;
  onMidCallFailure: (reason: string) => void;
}

export interface GcpConnection {
  close: () => void;
}

export async function connectGcp(_opts: GcpConnectOptions): Promise<GcpConnection | null> {
  return null;
}
