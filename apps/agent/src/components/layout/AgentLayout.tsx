import { Outlet, useLocation } from 'react-router-dom';
import { Header } from '@agent/components/layout/Header';
import { DesktopOverlay } from '@agent/components/layout/DesktopOverlay';
import { AgentSidebar, CALL_ROOM } from '@agent/components/layout/AgentSidebar';
import { IncomingCallOverlay } from '@agent/components/agent-status/IncomingCallOverlay';
import { cn } from '@vkyc/shared/lib/cn';

/**
 * Round 30 — rebuilt on the `.shell` design-system class (cf-design-system.css
 * §9): a `height:100vh; overflow:hidden` grid (sidebar | content column)
 * instead of the previous `min-h-screen flex` row, which let the whole page
 * grow taller than the viewport and scroll as a document. `.shell` doesn't
 * allow that — panels have to scroll inside themselves now instead.
 *
 * `<main>` needs `overflow-y: auto` so every existing page under this layout
 * keeps scrolling exactly as it did under the old page-level scroll, without
 * each one needing its own change — the ported `.workspace` class itself
 * defaults to `overflow: hidden` (future screens are meant to manage their
 * own internal scroll container explicitly; see that class's own comment).
 * Set as an inline style, not the `overflow-y-auto` Tailwind utility: tried
 * that first and it silently lost — `.workspace`'s plain `overflow: hidden`
 * and Tailwind's `.overflow-y-auto` are equal-specificity class selectors,
 * and `.workspace` compiles later in the bundle (this file imports after
 * index.css, where `@tailwind utilities` lives), so on a tie the later rule's
 * `overflow-y: hidden` — from the shorthand, not a separate rule — won.
 * Confirmed live: content was being clipped, not scrolling, before this fix.
 * An inline style has no such ambiguity.
 */
export function AgentLayout() {
  const location = useLocation();
  const noSidebar = CALL_ROOM.test(location.pathname);

  return (
    <div className={cn('shell', noSidebar && 'shell--no-sidebar')}>
      <DesktopOverlay />
      <AgentSidebar />
      <IncomingCallOverlay />
      {/*
       * `.shell`'s grid-template-columns is a fixed 2-track definition
       * (sidebar | content) that assumes both tracks are always filled — true
       * in the static reference, not true here, since AgentSidebar returns
       * null on call-room routes to go full-bleed. `gridColumn: 2` alone
       * (the original, incomplete fix) only controls which track this
       * column is PLACED in — it doesn't stop the grid from still reserving
       * a fixed 240px for the now-empty first track, which is exactly why a
       * persistent blank left rail kept reproducing on every call-room
       * screen despite that fix. `.shell--no-sidebar` (applied above,
       * confirmed via this exact same `CALL_ROOM` check `AgentSidebar`
       * itself uses) collapses `.shell` to a single real column on those
       * routes, so `gridColumn: 2` is only meaningful — and only applied —
       * when a sidebar column genuinely exists to place content after.
       */}
      <div className="flex min-w-0 flex-col" style={noSidebar ? undefined : { gridColumn: 2 }}>
        <Header />
        <main className="workspace flex-1" style={{ overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
