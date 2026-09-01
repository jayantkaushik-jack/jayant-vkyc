import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@vkyc/shared/features/auth/AuthContext';
import { AuthBrandPanel } from './AuthBrandPanel';

/**
 * Round 30 — full port of the reference 01-login.html / 02-otp.html into the
 * real auth flow. Structure/copy/behaviour ported from the handoff bundle,
 * with one deliberate deviation from that spec, confirmed directly with the
 * user after the initial build: the reference's format+domain email
 * validation and the OTP button's 6-digit gate both blocked routine testing
 * (this is a synthetic demo build — `verifyOtp()` never checks the code
 * either way), so both were loosened back toward the pre-redesign build's
 * behavior rather than left strictly spec-matched. See `EmailForm` and
 * `OtpForm`'s own comments for exactly what each still checks.
 *
 * Dropped from the previous version of this component: the generic
 * `validateEmail`/`demoAccounts` props. Neither was ever passed by the only
 * call site (`routes.tsx` renders `<LoginPage defaultRedirect="/agent" />`
 * with no other props) and the reference design has no slot for a demo-
 * accounts list.
 */

/** "sumit@cashfree.com" -> "s••••t@cashfree.com" — first/last char of the local part visible, everything between masked. Dot count reflects the real hidden length, unlike the reference's one fixed example. */
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  if (local.length <= 2) return `${local[0]}${'•'.repeat(Math.max(local.length - 1, 3))}@${domain}`;
  return `${local[0]}${'•'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
}

export function LoginPage({ defaultRedirect = '/agent' }: { defaultRedirect?: string }) {
  const { login, verifyOtp, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string } | null)?.from ?? defaultRedirect;
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (isAuthenticated) navigate(redirectTo, { replace: true });
  }, [isAuthenticated, navigate, redirectTo]);

  return (
    <main className="auth">
      <AuthBrandPanel />

      <section className="auth__panel">
        <div className="atmos" aria-hidden="true" style={{ opacity: 0.34 }}>
          <div className="atmos__blob" style={{ width: '52%', aspectRatio: '1', top: '-14%', right: '-10%', background: 'var(--blob-1)', opacity: 0.5 }} />
          <div className="atmos__blob" style={{ width: '46%', aspectRatio: '1', bottom: '-14%', left: '-8%', background: 'var(--blob-4)', opacity: 0.4 }} />
        </div>

        {step === 'email' ? (
          <EmailForm
            email={email}
            onEmailChange={setEmail}
            onValid={() => {
              login(email);
              setStep('otp');
            }}
          />
        ) : (
          <OtpForm
            email={email}
            onBack={() => setStep('email')}
            onVerified={() => {
              verifyOtp();
              navigate(redirectTo);
            }}
          />
        )}

        <p className="t-mono auth__meta anim-fade d-6">DEMO BUILD &middot; v0.30 &middot; SYNTHETIC DATA ONLY</p>
      </section>
    </main>
  );
}

/**
 * Round 30 loosened this from the handoff's own spec (confirmed with the
 * user): the reference's format regex (`name@domain.tld`) and a separate
 * `@cashfree.com`-only check are both dropped. Continue is disabled only
 * while the field is empty — matches the pre-redesign build's total lack of
 * validation, minus requiring *something* be typed. The `.field`/
 * `field__error` markup and the invalid-state CSS this depends on are left
 * in cf-design-system.css untouched — nothing here removes the capability,
 * just doesn't call it.
 */
function EmailForm({
  email,
  onEmailChange,
  onValid,
}: {
  email: string;
  onEmailChange: (v: string) => void;
  onValid: () => void;
}) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    onValid();
  }

  return (
    <div className="auth__card glass anim-rise d-3">
      <header className="auth__card-head">
        <h1 className="t-h1">Sign in</h1>
        <p className="t-small c-muted">Use your registered Cashfree work email.</p>
      </header>

      <form noValidate onSubmit={handleSubmit}>
        <div className="field">
          <label className="field__label" htmlFor="email">Registered work email address</label>
          <input
            className="field__input"
            id="email"
            type="email"
            autoComplete="username"
            autoFocus
            placeholder="you@cashfree.com"
            aria-describedby="emailHelp"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
          />
          <p className="field__help t-small" id="emailHelp">We&rsquo;ll send a 6-digit code to this address.</p>
        </div>
        <button
          className="btn btn--primary btn--lg btn--block btn--sheen"
          id="submitBtn"
          type="submit"
          style={{ marginTop: 'var(--s-6)' }}
          disabled={!email.trim()}
        >
          Continue
        </button>
      </form>

      <hr className="divider" style={{ margin: 'var(--s-6) 0 var(--s-4)' }} />
      <p className="t-small c-muted" style={{ textAlign: 'center' }}>
        Trouble signing in? <a href="#" style={{ fontWeight: 500, color: 'var(--cf-brand)' }}>Contact IT support</a>
      </p>
    </div>
  );
}

const OTP_LENGTH = 6;
type OtpStatus = 'idle' | 'verifying' | 'verified' | 'error';

function OtpForm({
  email,
  onBack,
  onVerified,
}: {
  email: string;
  onBack: () => void;
  onVerified: () => void;
}) {
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [status, setStatus] = useState<OtpStatus>('idle');
  const [invalidShake, setInvalidShake] = useState(false);
  const [resendLeft, setResendLeft] = useState(30);
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const lockedRef = useRef(false);

  useEffect(() => {
    if (resendLeft <= 0) return;
    const id = setInterval(() => setResendLeft((s) => Math.max(s - 1, 0)), 1000);
    return () => clearInterval(id);
  }, [resendLeft]);

  function wait(ms: number) {
    return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
  }

  /**
   * Round 30 loosened this from the handoff's own spec (confirmed with the
   * user): submit no longer requires a complete 6-digit code — clicking
   * "Verify and sign in" (the button below has no digit-count gate on it any
   * more either) proceeds with whatever's currently typed, including nothing
   * at all. Matches the pre-redesign build, where the old single OTP field's
   * submit button was never disabled either. `verifyOtp()` itself has never
   * checked the code's value, so this doesn't weaken anything that was
   * actually being enforced — only the UI's own extra gate on top of it. No
   * longer needs the digits themselves, just whether a submit is already
   * in flight.
   */
  async function submit() {
    if (lockedRef.current) return;
    lockedRef.current = true;
    setInvalidShake(false);
    setStatus('verifying');
    await wait(900);

    /**
     * verifyOtp() (packages/shared/src/features/auth/AuthContext.tsx) takes
     * no arguments and never reports failure — any 6 digits "work" today.
     * The reference's wrong-code recovery (shake/clear/refocus) has no real
     * trigger against that hook, so `success` is hardcoded true rather than
     * fabricating a failure condition nothing asked for. The branch below is
     * left in place, correctly wired, for if verifyOtp() ever gains a real
     * failure signal — not dead code from a bug, just currently unreachable.
     */
    const success = true;
    if (!success) {
      lockedRef.current = false;
      setInvalidShake(true);
      setStatus('error');
      setDigits(Array(OTP_LENGTH).fill(''));
      inputsRef.current[0]?.focus();
      return;
    }

    setStatus('verified');
    await wait(700);
    onVerified();
  }

  function handleChange(idx: number, raw: string) {
    if (lockedRef.current) return;
    setInvalidShake(false);
    const value = raw.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[idx] = value;
    setDigits(next);
    if (value && idx < OTP_LENGTH - 1) inputsRef.current[idx + 1]?.focus();
    if (next.join('').length === OTP_LENGTH) void submit();
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      const next = [...digits];
      next[idx - 1] = '';
      setDigits(next);
      inputsRef.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      e.preventDefault();
      inputsRef.current[idx - 1]?.focus();
    } else if (e.key === 'ArrowRight' && idx < OTP_LENGTH - 1) {
      e.preventDefault();
      inputsRef.current[idx + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    if (lockedRef.current) return;
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = Array(OTP_LENGTH).fill('');
    pasted.split('').forEach((c, k) => { next[k] = c; });
    setDigits(next);
    inputsRef.current[Math.min(pasted.length, OTP_LENGTH - 1)]?.focus();
    if (next.join('').length === OTP_LENGTH) void submit();
  }

  function handleResend() {
    if (resendLeft > 0) return;
    setResendLeft(30);
  }

  return (
    <div className="auth__card glass anim-rise d-3">
      <button className="link-btn" type="button" style={{ marginBottom: 'var(--s-4)' }} onClick={onBack}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
          strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
        Back
      </button>

      <header className="auth__card-head">
        <h1 className="t-h1">Enter your code</h1>
        <p className="t-small c-muted">We sent a 6-digit code to{' '}
          <span className="t-body-str" style={{ color: 'var(--n-900)' }}>{maskEmail(email)}</span></p>
      </header>

      <form noValidate onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <label className="field__label" htmlFor="otp-1" style={{ display: 'block', marginBottom: 'var(--s-2)' }}>Verification code</label>
        <div className={`otp${invalidShake ? ' is-invalid' : ''}${status === 'verifying' ? ' is-verifying' : ''}`} role="group" aria-label="Verification code">
          {digits.map((d, idx) => (
            <input
              key={idx}
              ref={(el) => { inputsRef.current[idx] = el; }}
              id={idx === 0 ? 'otp-1' : undefined}
              type="text"
              inputMode="numeric"
              autoComplete={idx === 0 ? 'one-time-code' : 'off'}
              maxLength={1}
              aria-label={`Digit ${idx + 1}`}
              autoFocus={idx === 0}
              className={d ? 'is-filled' : undefined}
              value={d}
              disabled={status === 'verifying' || status === 'verified'}
              onChange={(e) => handleChange(idx, e.target.value)}
              onKeyDown={(e) => handleKeyDown(idx, e)}
              onPaste={handlePaste}
            />
          ))}
        </div>

        <p className="t-small c-muted" role="status" aria-live="polite"
          style={{ marginTop: 'var(--s-3)', minHeight: 20, display: 'flex', alignItems: 'center', gap: 'var(--s-2)' }}>
          {status === 'verifying' && <span className="spinner" />}
          {status === 'verified' && <span className="spinner" />}
          {status === 'idle' && 'Paste the code or type it in.'}
          {status === 'verifying' && 'Verifying…'}
          {status === 'verified' && 'Verified. Opening your queue…'}
          {status === 'error' && <span className="c-da">That code isn&rsquo;t right. Check the latest email and try again.</span>}
        </p>

        <button className="btn btn--primary btn--lg btn--block btn--sheen" type="submit"
          style={{ marginTop: 'var(--s-4)' }} disabled={status === 'verifying' || status === 'verified'}>
          Verify and sign in
        </button>
      </form>

      <hr className="divider" style={{ margin: 'var(--s-6) 0 var(--s-4)' }} />
      <p className="t-small c-muted" style={{ textAlign: 'center' }}>
        Didn&rsquo;t receive it?{' '}
        <button className="link-btn" type="button" disabled={resendLeft > 0} onClick={handleResend}>
          {resendLeft > 0 ? `Resend in 00:${String(resendLeft).padStart(2, '0')}` : 'Resend code'}
        </button>
      </p>
    </div>
  );
}
