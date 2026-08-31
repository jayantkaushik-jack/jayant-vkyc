import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CashfreeLogo } from '@vkyc/shared/components/layout/CashfreeLogo';
import { Button } from '@agent/components/ui/Button';
import { Card } from '@agent/components/ui/Card';
import { useAuth } from '@vkyc/shared/features/auth/AuthContext';

interface LoginPageProps {
  defaultRedirect?: string;
  /** Returns an error string to block sign-in for an unrecognised email, or null to allow. */
  validateEmail?: (email: string) => string | null;
  /** Demo accounts hint rendered under the email field. */
  demoAccounts?: { email: string; label: string }[];
}

export function LoginPage({ defaultRedirect = '/agent', validateEmail, demoAccounts }: LoginPageProps) {
  const { login, verifyOtp, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = (location.state as { from?: string } | null)?.from ?? defaultRedirect;
  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (isAuthenticated) navigate(redirectTo, { replace: true });
  }, [isAuthenticated, navigate, redirectTo]);

  useEffect(() => {
    if (step !== 'otp') return;
    setCountdown(30);
    const id = setInterval(() => {
      setCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [step]);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateEmail) {
      const msg = validateEmail(email);
      if (msg) {
        setError(msg);
        return;
      }
    }
    setError(null);
    login(email);
    setStep('otp');
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyOtp();
    navigate(redirectTo);
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-[40%] bg-brand-950 relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 opacity-10">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full border border-white/20"
              style={{
                width: `${200 + i * 120}px`,
                height: `${200 + i * 120}px`,
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
              }}
            />
          ))}
        </div>
        <div className="relative z-10 scale-150">
          <CashfreeLogo variant="white" />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center bg-bg p-8">
        <Card className="w-full max-w-md" padding>
          {step === 'email' ? (
            <>
              <h1 className="text-xl font-semibold mb-1">Login</h1>
              <p className="text-text-muted text-sm mb-6">Sign in with your registered work email</p>
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5">
                    Registered Work Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(null); }}
                    placeholder="you@cashfree.com"
                    className="w-full px-3 py-2.5 rounded-lg border border-border focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:border-focus"
                    required
                  />
                  {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
                </div>
                <Button type="submit" className="w-full" size="lg">
                  Continue
                </Button>
                {demoAccounts && demoAccounts.length > 0 && (
                  <div className="mt-2 rounded-lg border border-border bg-primary-soft/30 p-3">
                    <p className="text-xs font-medium text-text-muted mb-1.5">Demo accounts</p>
                    <div className="space-y-1">
                      {demoAccounts.map((acc) => (
                        <button
                          key={acc.email}
                          type="button"
                          onClick={() => { setEmail(acc.email); setError(null); }}
                          className="w-full flex items-center justify-between text-xs text-left hover:text-primary"
                        >
                          <span className="font-mono">{acc.email}</span>
                          <span className="text-text-muted">{acc.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </form>
            </>
          ) : (
            <>
              <h1 className="text-xl font-semibold mb-1">Enter OTP</h1>
              <p className="text-text-muted text-sm mb-6">Enter OTP sent to your email</p>
              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <div>
                  <input
                    type="text"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="w-full px-3 py-2.5 rounded-lg border border-border text-center text-2xl tracking-[0.5em] focus:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:border-focus"
                  />
                </div>
                <p className="text-xs text-text-muted text-center">
                  Didn&apos;t Receive OTP?{' '}
                  {countdown > 0 ? (
                    <span>Resend in 00:{String(countdown).padStart(2, '0')}</span>
                  ) : (
                    <button type="button" className="text-primary hover:underline">
                      Resend OTP
                    </button>
                  )}
                </p>
                <Button type="submit" className="w-full" size="lg">
                  Login
                </Button>
                <button
                  type="button"
                  onClick={() => setStep('email')}
                  className="w-full text-sm text-primary hover:underline"
                >
                  Back
                </button>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
