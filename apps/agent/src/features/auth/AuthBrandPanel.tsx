/**
 * Round 30 — the left brand panel shared verbatim by the Login and OTP screens
 * (handoff §7: "extract it as one shared component. Signing in should read as
 * one place with two steps."). Markup, gradients, and the shield SVG are
 * ported directly from the reference bundle's 01-login.html / 02-otp.html —
 * byte-identical between both screens' usage of this component.
 *
 * Logo: the real Cashfree Secure ID lockup (round 30 asset), dark-on-light
 * variant — this panel is always the light Thunderclap theme by default,
 * the only theme actually reachable in the running app right now (no brand
 * theme switcher is wired up anywhere, so the purple `[data-brand="purple"]`
 * variant is CSS-only future-proofing, not something this component needs to
 * branch on).
 */
export function AuthBrandPanel() {
  return (
    <section className="auth__brand">
      <div className="atmos" aria-hidden="true">
        <div className="atmos__blob" style={{ width: '60%', aspectRatio: '1', top: '-18%', left: '-14%', background: 'var(--blob-1)', opacity: 0.85 }} />
        <div className="atmos__blob" style={{ width: '66%', aspectRatio: '1', top: '14%', left: '24%', background: 'var(--blob-2)', opacity: 0.8 }} />
        <div className="atmos__blob" style={{ width: '54%', aspectRatio: '1', bottom: '-16%', left: '-8%', background: 'var(--blob-3)', opacity: 0.75 }} />
        <div className="atmos__blob" style={{ width: '52%', aspectRatio: '1', bottom: '-10%', right: '-16%', background: 'var(--blob-4)', opacity: 0.7 }} />
      </div>
      <div className="blueprint" aria-hidden="true">
        <div className="blueprint__grid" />
        <span className="blueprint__bracket blueprint__bracket--tl" />
        <span className="blueprint__bracket blueprint__bracket--tr" />
        <span className="blueprint__bracket blueprint__bracket--bl" />
        <span className="blueprint__bracket blueprint__bracket--br" />
      </div>

      <div className="auth__hero glass-object anim-fade d-3" aria-hidden="true">
        <svg viewBox="0 0 400 460" fill="none">
          <defs>
            <linearGradient id="gB" x1="60" y1="30" x2="350" y2="430" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#FFFFFF" stopOpacity=".62" />
              <stop offset=".42" stopColor="#FFFFFF" stopOpacity=".22" />
              <stop offset="1" stopColor="#FFFFFF" stopOpacity=".40" />
            </linearGradient>
            <linearGradient id="gC" x1="90" y1="70" x2="330" y2="410" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="var(--blob-1)" stopOpacity=".85" />
              <stop offset=".55" stopColor="var(--blob-3)" stopOpacity=".45" />
              <stop offset="1" stopColor="var(--blob-4)" stopOpacity=".85" />
            </linearGradient>
            <linearGradient id="gR" x1="80" y1="20" x2="320" y2="440" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#FFFFFF" stopOpacity=".95" />
              <stop offset=".5" stopColor="#FFFFFF" stopOpacity=".28" />
              <stop offset="1" stopColor="#FFFFFF" stopOpacity=".75" />
            </linearGradient>
            <filter id="sf" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="16" /></filter>
            <filter id="sfs" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="7" /></filter>
          </defs>
          <path d="M200 26 356 92v152c0 96-62 158-156 190C106 402 44 340 44 244V92z" fill="url(#gC)" filter="url(#sf)" opacity=".9" />
          <path d="M200 26 356 92v152c0 96-62 158-156 190C106 402 44 340 44 244V92z" fill="url(#gB)" />
          <path d="M200 26 356 92v152c0 96-62 158-156 190C106 402 44 340 44 244V92z" stroke="url(#gR)" strokeWidth="3.5" fill="none" />
          <ellipse cx="140" cy="132" rx="58" ry="86" fill="#FFFFFF" opacity=".34" filter="url(#sfs)" transform="rotate(-24 140 132)" />
          <path d="M148 226l38 40 72-84" stroke="#FFFFFF" strokeOpacity=".92" strokeWidth="17" strokeLinecap="round" strokeLinejoin="round" />
          <ellipse cx="204" cy="446" rx="118" ry="17" fill="var(--blob-4)" opacity=".34" filter="url(#sf)" />
        </svg>
        <span className="orb" style={{ width: 60, height: 60, top: '6%', right: '2%', animationDelay: '-2s' }} />
        <span className="orb" style={{ width: 34, height: 34, bottom: '20%', left: '-3%', animationDelay: '-4.5s' }} />
      </div>

      <div className="auth__logo anim-rise d-1">
        <img className="brand-logo brand-logo--lg" src="/assets/cashfree-secure-id-dark.png" alt="Cashfree Secure ID" />
      </div>

      <div className="auth__copy">
        <p className="t-eyebrow auth__eyebrow anim-rise d-2">Amber Resolution Layer</p>
        <h2 className="auth__name anim-rise d-3">Mule<br />Sentinel</h2>
        <p className="auth__support anim-rise d-4">Resolve the cases a score can&rsquo;t.</p>
      </div>

      <p className="t-mono auth__foot anim-rise d-5">Agent console</p>
    </section>
  );
}
