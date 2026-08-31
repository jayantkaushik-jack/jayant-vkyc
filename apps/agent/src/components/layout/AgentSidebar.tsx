import { useLocation, useNavigate } from 'react-router-dom';
import { Icon, LeftNavbar, Logo } from '@cashfree-intl/cashmere';
import type { LeftNavbarNavSection } from '@cashfree-intl/cashmere';

/**
 * The agent sidebar on cashmere's LeftNavbar.
 *
 * This is the largest visual change in the app: cashmere's sidebar is *dark* — its inner
 * panel is `--sds-neutral-bg-inverse-inverse` with inverse text — where this was a light
 * panel with a purple active pill. It also owns its own padding (32px horizontal on every
 * slot) and its own active treatment (`bg-inverse-active` plus bold), so none of the old
 * per-item classes survive.
 *
 * Three things the API forces:
 *
 * 1. **Active state must be passed in.** `LeftNavbar.Nav` resolves the current item from
 *    `window.location`, read *once on mount* — fine for a server-rendered Pulse page, wrong
 *    for a SPA, where the sidebar never remounts as you navigate. Per-item `current`
 *    overrides that, so it's computed from `useLocation()` on every render.
 *
 * 2. **Navigation must be intercepted.** Items are real `<a href>` elements, and a full
 *    page load would drop the in-memory auth session and bounce to /login. `onClick` is
 *    passed through to the anchor, so each item preventDefaults and calls `navigate()`.
 *    Cmd/ctrl/middle-click fall through untouched so "open in new tab" still works.
 *
 * 3. **Width.** The root is `width: min(100%, 22.375rem)` — up to 358px, which is far wider
 *    than this app's four-item nav needs. `!w-sidebar` (256px) pins it; the `!` is there
 *    because cashmere's own width declaration has the same specificity as a plain utility.
 *    That token is shared with the incoming-call overlay, which has to align to the content
 *    column beside this.
 *
 * The logo moved here from the header: with a full-height sidebar the brand belongs in its
 * header slot, and `type="light"` is required because Logo renders an `<img>` rather than an
 * inline SVG, so it escapes the inner panel's currentColor recolouring.
 */

/** Route → cashmere icon. All four exist natively, so no lucide fallback is needed here. */
const NAV_ITEMS = [
  { to: '/agent', label: 'Home', icon: 'home' },
  { to: '/agent/profile', label: 'Profile', icon: 'user' },
  { to: '/agent/performance', label: 'Analytics', icon: 'bargraph' },
  { to: '/agent/knowledge', label: 'Knowledge Center', icon: 'bookopentext' },
] as const;

/** Matches the call room, which is full-bleed and hides the sidebar entirely. */
const CALL_ROOM = /^\/agent\/call\//;

/**
 * `/agent` is the index route, so it only counts as active on an exact match — otherwise
 * every child route would light Home up alongside itself.
 */
function isActive(pathname: string, to: string): boolean {
  return to === '/agent' ? pathname === to : pathname.startsWith(to);
}

/** Lets cmd-click / ctrl-click / middle-click behave like a normal link. */
function isModifiedClick(e: React.MouseEvent): boolean {
  return e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;
}

export function AgentSidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  if (CALL_ROOM.test(location.pathname)) return null;

  const sections: LeftNavbarNavSection[] = [
    {
      id: 'main',
      items: NAV_ITEMS.map(({ to, label, icon }) => ({
        type: 'link' as const,
        id: to,
        label,
        href: to,
        current: isActive(location.pathname, to),
        // `lg` is cashmere's NAV_LEADING_ICON_SIZE — 20px.
        icon: <Icon name={icon} size="lg" />,
        onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
          if (isModifiedClick(e)) return;
          e.preventDefault();
          navigate(to);
        },
      })),
    },
  ];

  return (
    <LeftNavbar className="!w-sidebar shrink-0">
      <LeftNavbar.Header icon={<Logo type="light" />} />
      <LeftNavbar.Nav sections={sections} />
    </LeftNavbar>
  );
}
