import { useAgent } from '@agent/features/agent/AgentContext';
import { SessionStatusHeaderCluster } from '@agent/components/session-status/SessionStatusHeaderCluster';

/**
 * Still a hand-written `<header>`, deliberately.
 *
 * cashmere's TopNavigation looked like the obvious fit and isn't: it does not render
 * `children` at all. It composes a fixed title stack, an optional `searchSlot` and a row of
 * trailing icon buttons — there is no slot that will take the session-status cluster (two
 * live timers, an avatar and a status dropdown), and that cluster is the entire reason this
 * header exists. Forcing it in would mean rendering it outside the component and absolutely
 * positioning it over the top, which is worse than matching the metrics by hand.
 *
 * So this stays custom but is built from DS tokens: cashmere's off-white surface, its neutral
 * border, and a 64px bar on the 8px grid. Horizontal padding is 24px to line up with the
 * page content below it rather than the sidebar's 32px slots.
 *
 * The logo moved to the sidebar's header slot — with a full-height sidebar that's where the
 * brand belongs, so the greeting is now the leading element here.
 */
export function Header() {
  const { agent, status, setStatus, getLoggedInSec, getBreakSec } = useAgent();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-surface">
      <div className="flex h-16 items-center justify-between gap-4 px-6">
        <span className="text-sm font-semibold text-text">
          Hi, {agent.name.split(' ')[0]}
        </span>

        <SessionStatusHeaderCluster
          person={{ id: agent.id, name: agent.name }}
          status={status}
          setStatus={setStatus}
          getLoggedInSec={getLoggedInSec}
          getBreakSec={getBreakSec}
        />
      </div>
    </header>
  );
}
