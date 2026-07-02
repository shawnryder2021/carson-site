'use client';

import { useState, useEffect, useMemo } from 'react';
import { Icon } from '@/components/Icon';
import { getBrowserClient } from '@/lib/supabase/client';

type Customer = {
  id: string;
  email: string;
  createdAt: string;
  lastSignInAt: string | null;
  name: string;
  phone: string;
  contactPref: 'email' | 'sms';
  savedCount: number;
  watchCount: number;
  leadCount: number;
  requestCount: number;
};

function fmtDate(iso: string | null) {
  if (!iso) return 'Never';
  return new Date(iso).toLocaleDateString('en-CA', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const sb = getBrowserClient();
        const { data: sess } = await sb!.auth.getSession();
        const token = sess?.session?.access_token;
        const res = await fetch('/api/customers', { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        const json = await res.json();
        if (!res.ok) setError(json.error || `Error ${res.status}`);
        else setCustomers(json.customers || []);
      } catch (e: any) {
        setError(e?.message || 'Failed to load');
      }
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || c.phone.includes(q));
  }, [customers, query]);

  const totalEngagement = (c: Customer) => c.savedCount + c.watchCount + c.leadCount + c.requestCount;

  return (
    <div style={{ padding: '32px 40px 60px', maxWidth: 1100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 30, fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 6px' }}>Customers</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>Shoppers with a My Garage account — {customers.length} total.</p>
        </div>
        <input
          className="input"
          placeholder="Search name, email, phone…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ width: 260 }}
        />
      </div>

      {loading ? (
        <div style={{ color: 'var(--muted)', padding: 20 }}>Loading…</div>
      ) : error ? (
        <div style={{ background: /not configured|SUPABASE_SERVICE_ROLE_KEY/i.test(error) ? '#FFF4E5' : '#FDECEC', color: /not configured|SUPABASE_SERVICE_ROLE_KEY/i.test(error) ? '#8A5400' : '#A8232C', borderRadius: 12, padding: '16px 18px', fontSize: 14 }}>
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-soft)', borderRadius: 16 }}>
          <Icon name="users" size={36} style={{ color: 'var(--muted)', marginBottom: 12 }} />
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>
            {customers.length === 0 ? 'No customers yet' : 'No matches'}
          </div>
          <div style={{ fontSize: 14, color: 'var(--muted)' }}>
            {customers.length === 0
              ? 'Signups will show up here once shoppers create a My Garage account.'
              : 'Try a different search.'}
          </div>
        </div>
      ) : (
        <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 0.9fr 0.9fr 1.4fr', gap: 12, padding: '10px 20px', fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em', borderBottom: '1px solid var(--line)' }}>
            <span>Customer</span>
            <span>Joined</span>
            <span>Last active</span>
            <span>Prefers</span>
            <span>Activity</span>
          </div>
          {filtered.map(c => (
            <div key={c.id} style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 0.9fr 0.9fr 1.4fr', gap: 12, padding: '14px 20px', borderBottom: '1px solid var(--line)', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{c.name || '(no name)'}</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{c.email}</div>
                {c.phone && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{c.phone}</div>}
              </div>
              <div style={{ fontSize: 13 }}>{fmtDate(c.createdAt)}</div>
              <div style={{ fontSize: 13 }}>{fmtDate(c.lastSignInAt)}</div>
              <div>
                <span style={{ background: 'var(--bg-soft)', padding: '3px 9px', borderRadius: 999, fontSize: 11.5, fontWeight: 700, textTransform: 'capitalize' }}>{c.contactPref}</span>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {c.savedCount > 0 && <span style={{ background: 'var(--teal-tint)', color: 'var(--teal-2)', padding: '3px 9px', borderRadius: 999, fontSize: 11.5, fontWeight: 700 }}><Icon name="heart" size={10} style={{ verticalAlign: '-1px' }} /> {c.savedCount}</span>}
                {c.watchCount > 0 && <span style={{ background: 'var(--teal-tint)', color: 'var(--teal-2)', padding: '3px 9px', borderRadius: 999, fontSize: 11.5, fontWeight: 700 }}><Icon name="trend" size={10} style={{ verticalAlign: '-1px' }} /> {c.watchCount}</span>}
                {(c.leadCount + c.requestCount) > 0 && <span style={{ background: 'var(--teal-tint)', color: 'var(--teal-2)', padding: '3px 9px', borderRadius: 999, fontSize: 11.5, fontWeight: 700 }}><Icon name="send" size={10} style={{ verticalAlign: '-1px' }} /> {c.leadCount + c.requestCount}</span>}
                {totalEngagement(c) === 0 && <span style={{ fontSize: 12, color: 'var(--muted)' }}>No activity yet</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
