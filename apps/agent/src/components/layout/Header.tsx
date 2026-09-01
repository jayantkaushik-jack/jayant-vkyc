import { useAgent } from '@agent/features/agent/AgentContext';
import { SessionStatusHeaderCluster } from '@agent/components/session-status/SessionStatusHeaderCluster';

/**
 * Round 30 — rebuilt on the `.topbar` design-system class (cf-design-system.css
 * §9) instead of the hand-rolled Tailwind header. Adds the "Amber resolution ·
 * Farmer & SIM queues" tagline under the greeting, per the reference (03-home-
 * offline.html) — static descriptive copy, not derived from any per-agent data.
 */
export function Header() {
  const { agent, status, setStatus, getLoggedInSec, getBreakSec } = useAgent();

  return (
    <header className="topbar">
      <div>
        <h1 className="t-h2">Hi, {agent.name.split(' ')[0]}</h1>
        <p className="t-small c-muted">Amber resolution &middot; Farmer &amp; SIM queues</p>
      </div>

      <SessionStatusHeaderCluster
        person={{ id: agent.id, name: agent.name }}
        status={status}
        setStatus={setStatus}
        getLoggedInSec={getLoggedInSec}
        getBreakSec={getBreakSec}
      />
    </header>
  );
}
