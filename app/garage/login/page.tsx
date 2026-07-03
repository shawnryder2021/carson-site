'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { getBrowserClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { safeNext } from '@/lib/safeNext';

type Mode = 'signin' | 'signup' | 'magic';

function GarageLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get('next'), '/garage');
  const linkError = params.get('error') === 'link';

  const [mode, setMode] = useState<Mode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(linkError ? 'That sign-in link didn’t work — it may have expired. Request a fresh one below.' : null);
  const [checkEmail, setCheckEmail] = useState(false);
  const [loading, setLoading] = useState(false);

  const callbackUrl = () =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const sb = getBrowserClient();
    if (!sb) { setError('Sign-in isn’t available right now. Please try again later.'); return; }
    setLoading(true);

    try {
      if (mode === 'signin') {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) { setError(error.message); return; }
        router.push(next);
        router.refresh();
      } else if (mode === 'signup') {
        const { data, error } = await sb.auth.signUp({
          email,
          password,
          options: { data: { name }, emailRedirectTo: callbackUrl() },
        });
        if (error) { setError(error.message); return; }
        if (data.session) {
          router.push(next);
          router.refresh();
        } else {
          setCheckEmail(true);
        }
      } else {
        const { error } = await sb.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: callbackUrl(), shouldCreateUser: true },
        });
        if (error) { setError(error.message); return; }
        setCheckEmail(true);
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkEmail) {
    return (
      <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ width: '100%', maxWidth: 420, background: 'white', border: '1px solid var(--line)', borderRadius: 16, padding: '32px 30px', textAlign: 'center' }}>
          <div style={{ width: 52, height: 52, margin: '0 auto 16px', borderRadius: '50%', background: 'var(--teal-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="mail" size={26} style={{ color: 'var(--teal-2)' }} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Check your email</div>
          <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6 }}>
            We sent a link to <strong style={{ color: 'var(--ink)' }}>{email}</strong>. Click it and you&apos;ll land right in your garage.
          </div>
          <button onClick={() => { setCheckEmail(false); setNotice(null); }} className="btn btn-ghost btn-sm" style={{ marginTop: 20 }}>
            <Icon name="arrowLeft" size={13} /> Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, margin: '0 auto 12px', borderRadius: 16, background: 'var(--teal-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="car" size={28} style={{ color: 'var(--teal-2)' }} />
          </div>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, fontWeight: 700, letterSpacing: '-.02em', margin: 0 }}>My Garage</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 6, lineHeight: 1.5 }}>
            Save cars across devices, track price drops, and see your requests.
          </p>
        </div>

        <form onSubmit={submit} style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 16, padding: '26px 28px' }}>
          {!isSupabaseConfigured && (
            <div style={{ background: '#FFF4E5', color: '#8A5400', borderRadius: 10, padding: '12px 14px', fontSize: 13, marginBottom: 18, lineHeight: 1.5 }}>
              Accounts aren&apos;t available yet — check back soon.
            </div>
          )}

          {/* Mode tabs */}
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-soft)', borderRadius: 10, padding: 4, marginBottom: 20 }}>
            {([['signin', 'Sign in'], ['signup', 'Create account'], ['magic', 'Email link']] as [Mode, string][]).map(([m, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(null); }}
                style={{
                  flex: 1, padding: '8px 4px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap',
                  background: mode === m ? 'white' : 'transparent',
                  color: mode === m ? 'var(--ink)' : 'var(--muted)',
                  boxShadow: mode === m ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === 'signup' && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>Name</div>
              <input className="input" value={name} onChange={e => setName(e.target.value)} required placeholder="Your name" />
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>Email</div>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" />
          </div>

          {mode !== 'magic' && (
            <div style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>Password</div>
              <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} placeholder="••••••••" />
            </div>
          )}

          {mode === 'magic' && (
            <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 18 }}>
              No password needed — we&apos;ll email you a one-tap sign-in link. Works for new and existing accounts.
            </div>
          )}

          {notice && <div style={{ background: '#FFF4E5', color: '#8A5400', borderRadius: 10, padding: '10px 12px', fontSize: 13, marginBottom: 14, lineHeight: 1.5 }}>{notice}</div>}
          {error && <div style={{ background: '#FDECEE', color: '#A8232C', borderRadius: 10, padding: '10px 12px', fontSize: 13, marginBottom: 14 }}>{error}</div>}

          <button type="submit" disabled={loading || !isSupabaseConfigured} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
            {loading
              ? 'One moment…'
              : mode === 'signin' ? <>Sign in <Icon name="arrowRight" size={14} /></>
              : mode === 'signup' ? <>Create my garage <Icon name="arrowRight" size={14} /></>
              : <>Email me a sign-in link <Icon name="send" size={14} /></>}
          </button>

          <div style={{ fontSize: 11.5, color: 'var(--muted)', textAlign: 'center', marginTop: 14, lineHeight: 1.5 }}>
            <Icon name="shield" size={11} style={{ verticalAlign: '-1px' }} /> Free, no obligation. We never share your info.
          </div>
        </form>
      </div>
    </div>
  );
}

export default function GarageLoginPage() {
  return (
    <Suspense fallback={<div className="page fade-in" style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--muted)' }}>Loading…</div>}>
      <GarageLoginForm />
    </Suspense>
  );
}
