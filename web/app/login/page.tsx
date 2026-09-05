'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MailOpen } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { authApi } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/client';
import { GOOGLE_WEB_CLIENT_ID } from '@/lib/config';
import { Spinner } from '@/components/ui';

const IMG_1 =
  'https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=800';
const IMG_2 =
  'https://images.unsplash.com/photo-1520390138845-fd2d229dd553?auto=format&fit=crop&q=80&w=800';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (el: HTMLElement, options: Record<string, unknown>) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export default function LoginPage() {
  const { signIn, signUp, signInGoogle, user, loading } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [verifyNotice, setVerifyNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Once signed in, leave the auth flow.
  useEffect(() => {
    if (user && !loading) router.replace('/home');
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;

    if (mode === 'signup' && !name.trim()) {
      setError('Tell us what to call you.');
      return;
    }
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }

    setBusy(true);
    setError(null);
    try {
      if (mode === 'signup') {
        const message = await signUp(name, email.trim().toLowerCase(), password);
        setPendingEmail(email.trim().toLowerCase());
        setVerifyNotice(message);
      } else {
        await signIn(email, password);
        // Auth state updates → effect redirects to /home.
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setPendingEmail(email.trim().toLowerCase());
        setVerifyNotice(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Please try again.');
      }
      setBusy(false);
    }
  };

  const handleResend = async () => {
    if (!pendingEmail) return;
    try {
      const { message } = await authApi.resendVerification(pendingEmail);
      setVerifyNotice(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not resend.');
    }
  };

  return (
    <main className="flex min-h-dvh flex-col items-center bg-cream px-8 py-10">
      {/* Stacked photo collage */}
      <div className="relative mb-12 h-[280px] w-[256px]" aria-hidden>
        <div
          className="absolute right-0 top-0 h-[256px] w-[256px] rotate-3 overflow-hidden rounded-2xl shadow-[0_10px_20px_rgba(0,0,0,0.25)]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={IMG_1} alt="" className="h-full w-full object-cover" loading="lazy" />
        </div>
        <div
          className="absolute bottom-0 left-[-24px] h-[192px] w-[192px] -rotate-6 overflow-hidden rounded-2xl border-4 border-white shadow-[0_8px_14px_rgba(0,0,0,0.18)]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={IMG_2} alt="" className="h-full w-full object-cover" loading="lazy" />
        </div>
      </div>

      {pendingEmail ? (
        <div className="flex max-w-sm flex-col items-center text-center">
          <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-peach">
            <MailOpen size={30} color="#FDFBF7" />
          </div>
          <h1 className="font-display mb-3 text-2xl font-semibold italic text-charcoal">
            Check your inbox
          </h1>
          <p className="mb-6 text-sm leading-relaxed text-muted">
            {verifyNotice ??
              `We sent a verification link to ${pendingEmail}. Tap it to activate your account, then sign in.`}
          </p>
          <button className="btn btn-dark w-full" onClick={() => void handleResend()}>
            Resend email
          </button>
          <button
            className="mt-5 text-[13px] font-semibold text-muted underline"
            onClick={() => {
              setPendingEmail(null);
              setVerifyNotice(null);
              setMode('signin');
            }}
          >
            Go to sign in
          </button>
        </div>
      ) : (
        <div className="flex w-full max-w-sm flex-col">
          <h1 className="font-display mb-4 text-center text-[34px] font-semibold italic text-charcoal">
            {mode === 'signin' ? 'Welcome Home' : 'Join Kindred'}
          </h1>
          <p className="mb-9 text-center text-sm leading-relaxed text-muted">
            Invite your loved ones and start building your shared story, one frame at a time.
          </p>

          <form onSubmit={handleSubmit} className="flex w-full flex-col">
            {mode === 'signup' && (
              <input
                className="input mb-3.5"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            )}
            <input
              className="input mb-3.5"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
            <input
              className="input mb-3.5"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              minLength={8}
              required
            />

            {error && (
              <p className="mb-3 rounded-2xl bg-red-50 px-4 py-3 text-center text-[13px] text-danger">
                {error}
              </p>
            )}

            <button className="btn btn-dark w-full" disabled={busy}>
              {busy ? (
                <Spinner light />
              ) : mode === 'signin' ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <button
            className="mt-5 py-1.5 text-[13px] font-semibold text-peach"
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          >
            {mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}
          </button>

          <div className="my-6 flex w-full items-center gap-3">
            <span className="h-px flex-1 bg-charcoal/10" />
            <span className="text-[11px] uppercase tracking-[2px] text-muted">or</span>
            <span className="h-px flex-1 bg-charcoal/10" />
          </div>

          <GoogleButton
            onIdToken={(token) =>
              void signInGoogle(token).catch((err) =>
                setError(err instanceof Error ? err.message : 'Google sign-in failed.')
              )
            }
            disabled={busy}
          />

          <p className="mt-7 max-w-[300px] self-center text-center text-xs leading-[19px] text-muted/75">
            By continuing, you agree to our terms. We promise to keep your memories private and
            safe.
          </p>
        </div>
      )}
    </main>
  );
}

function GoogleButton({ onIdToken, disabled }: { onIdToken: (t: string) => void; disabled: boolean }) {
  const [ready, setReady] = useState(false);

  // Load Google Identity Services once a web client ID is configured.
  useEffect(() => {
    if (!GOOGLE_WEB_CLIENT_ID) return;
    const existing = document.getElementById('gsi-script');
    if (existing) {
      setReady(true);
      return;
    }
    const script = document.createElement('script');
    script.id = 'gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => setReady(true);
    document.head.appendChild(script);
  }, []);

  const handleClick = () => {
    if (!GOOGLE_WEB_CLIENT_ID) {
      alert(
        'Google sign-in is not configured yet. Set NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID and add the same ID to the backend\u2019s GOOGLE_CLIENT_IDS. Email sign-in always works.'
      );
      return;
    }
    if (!ready || !window.google) return;
    window.google.accounts.id.initialize({
      client_id: GOOGLE_WEB_CLIENT_ID,
      callback: (response: { credential?: string }) => {
        if (response.credential) onIdToken(response.credential);
      },
    });
    window.google.accounts.id.prompt();
  };

  return (
    <button className="btn btn-dark w-full" onClick={handleClick} disabled={disabled}>
      <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-peach text-[13px] font-extrabold text-white">
        G
      </span>
      Continue with Google
    </button>
  );
}
