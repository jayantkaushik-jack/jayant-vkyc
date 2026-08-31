import { Outlet } from 'react-router-dom';
import { Header } from '@agent/components/layout/Header';
import { DesktopOverlay } from '@agent/components/layout/DesktopOverlay';
import { AgentSidebar } from '@agent/components/layout/AgentSidebar';
import { IncomingCallOverlay } from '@agent/components/agent-status/IncomingCallOverlay';

/**
 * Two-column shell: a full-height sidebar beside a column holding the header and content.
 *
 * This replaces a `position: fixed` sidebar plus a matching `padding-left` on `<main>` —
 * two places that had to agree on 232px, and which broke as soon as the sidebar's width
 * came from cashmere rather than from this file. In a flex row the sidebar declares its own
 * width and the content column takes whatever is left, so there's nothing left to keep in
 * sync. `AgentSidebar` returning `null` in the call room now collapses the column on its
 * own, which is what makes that screen full-bleed.
 *
 * `min-w-0` on the content column matters: without it a wide child (the performance tables)
 * would push the column past the viewport instead of scrolling inside it, because flex items
 * default to `min-width: auto`.
 */
export function AgentLayout() {
  return (
    <div className="min-h-screen flex grid-paper">
      <DesktopOverlay />
      <AgentSidebar />
      <IncomingCallOverlay />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
