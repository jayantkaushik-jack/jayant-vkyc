import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Round 30 — rebuilt on the new `.sidebar`/`.nav-item` design-system classes
 * (src/styles/cf-design-system.css §9) instead of cashmere's `LeftNavbar`.
 * Not a restyle-in-place: the reference shell's exact grid/scroll structure
 * (`.shell { height:100vh; overflow:hidden }`, sidebar as a direct grid
 * column) doesn't map cleanly onto `LeftNavbar`'s own width/layout API, and
 * `@cashfree-intl/cashmere` is aliased to a local stub in this app anyway
 * (vite.config.ts — no real registry credentials exist here), so there's no
 * real design-system dependency being dropped, just this app's own
 * placeholder for one. `Icon`/`Button`/`Tag`/etc. from that stub are still
 * used elsewhere and untouched.
 *
 * All the real logic — active-route detection recomputed from `useLocation`
 * on every render (not resolved once from `window.location`), in-SPA
 * navigation interception with modifier-click passthrough, and the call-room
 * full-bleed collapse — is unchanged from the previous version, just no
 * longer expressed through `LeftNavbar`'s section/item data shape.
 */

const NAV_ITEMS = [
  {
    to: '/agent',
    label: 'Home',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.6V21h14V9.6" />
      </svg>
    ),
  },
  {
    to: '/agent/profile',
    label: 'Profile',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="8" r="3.6" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
      </svg>
    ),
  },
  {
    to: '/agent/performance',
    label: 'Analytics',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M5 20V11" /><path d="M12 20V5" /><path d="M19 20v-6" />
      </svg>
    ),
  },
  {
    to: '/agent/knowledge',
    label: 'Knowledge Center',
    icon: (
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" /><path d="M9 3v14" />
      </svg>
    ),
  },
] as const;

/** Matches the call room, which is full-bleed and hides the sidebar entirely. Exported so `AgentLayout` can check the exact same condition when deciding whether `.shell` still needs to reserve a sidebar column. */
export const CALL_ROOM = /^\/agent\/call\//;

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

  return (
    <nav className="sidebar" aria-label="Main">
      <div className="sidebar__brand">
        <img className="brand-logo brand-logo--sm" src="/assets/cashfree-secure-id-white.png" alt="Cashfree Secure ID" />
        <span className="sidebar__product">Mule Sentinel</span>
      </div>

      {NAV_ITEMS.map(({ to, label, icon }) => {
        const active = isActive(location.pathname, to);
        return (
          <a
            key={to}
            className={active ? 'nav-item is-active' : 'nav-item'}
            href={to}
            aria-current={active ? 'page' : undefined}
            onClick={(e) => {
              if (isModifiedClick(e)) return;
              e.preventDefault();
              navigate(to);
            }}
          >
            {icon}
            {label}
          </a>
        );
      })}

      <div className="sidebar__foot">
        <p className="t-mono" style={{ color: 'var(--n-400)', fontSize: 10, letterSpacing: '.07em' }}>DEMO BUILD &middot; v0.30</p>
        <p className="t-mono" style={{ color: 'var(--n-500)', fontSize: 10, letterSpacing: '.07em', marginTop: 2 }}>SYNTHETIC DATA ONLY</p>
      </div>
    </nav>
  );
}
