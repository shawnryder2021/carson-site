'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { getBrowserClient } from '@/lib/supabase/client';
import { isSupabaseConfigured } from '@/lib/supabase/config';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') || '/admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const sb = getBrowserClient();
    if (!sb) {
      setError('Supabase is not configured yet. Add your keys to enable login.');
      return;
    }
    setLoading(true);
    const { error } = await sb.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    router.push(next);
    router.refresh();
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-soft)', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <img src="/carson-logo.svg" alt="Carson Exports" style={{ height: 34 }} />
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 10 }}>Admin sign in</div>
        </div>

        <form onSubmit={submit} style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 16, padding: '28px 30px' }}>
          {!isSupabaseConfigured && (
            <div style={{ background: '#FFF4E5', color: '#8A5400', borderRadius: 10, padding: '12px 14px', fontSize: 13, marginBottom: 18, lineHeight: 1.5 }}>
              Supabase isn’t configured. Add <code>NEXT_PUBLIC_SUPABASE_URL</code> and <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, then redeploy.
            </div>
          )}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>Email</div>
            <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@carsonexports.com" />
          </div>
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>Password</div>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
          </div>
          {error && (
            <div style={{ background: '#FDECEE', color: '#A8232C', borderRadius: 10, padding: '10px 12px', fontSize: 13, marginBottom: 16 }}>{error}</div>
          )}
          <button type="submit" disabled={loading} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
            {loading ? 'Signing in…' : <>Sign in <Icon name="arrowRight" size={14} /></>}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
