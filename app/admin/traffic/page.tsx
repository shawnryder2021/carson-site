'use client';

import { useEffect, useState, useCallback } from 'react';
import { getBrowserClient } from '@/lib/supabase/client';

type Stat = { total: number; rows: { label: string; count: number }[]; error?: string };
type Bundle = Record<string, Stat> & { from?: string; to?: string };

const RANGES = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
];

function ymd(d: Date) { return d.toISOString().slice(0, 10); }

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, padding: '18px 22px' }}>
      <div style={{ fontFamily: 'var(--display)', fontSize: 32, fontWeight: 700, letterSpacing: '-.02em', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 6 }}>{label}</div>
    </div>
  );
}

function cleanReferrer(label: string) {
  if (!label || label === '—') return 'Direct / none';
  return label.replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function Panel({ title, stat, transform }: { title: string; stat?: Stat; transform?: (s: string) => string }) {
  const rows = (stat?.rows || []).filter(r => r.count > 0).slice(0, 8);
  const max = Math.max(1, ...rows.map(r => r.count));
  return (
    <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, padding: '20px 24px' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 14 }}>{title}</div>
      {stat?.error ? (
        <div style={{ fontSize: 13, color: '#A8232C' }}>{stat.error}</div>
      ) : rows.length === 0 ? (
        <div style={{ fontSize: 13.5, color: 'var(--muted)' }}>No data for this range yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          {rows.map((r, i) => (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
                <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '78%' }}>
                  {transform ? transform(r.label) : (r.label || '—')}
                </span>
                <span style={{ color: 'var(--muted)', fontWeight: 700 }}>{r.count.toLocaleString()}</span>
              </div>
              <div style={{ height: 6, background: 'var(--bg-soft)', borderRadius: 999 }}>
                <div style={{ height: 6, width: `${Math.round((r.count / max) * 100)}%`, background: 'var(--teal)', borderRadius: 999 }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminTraffic() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Bundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sb = getBrowserClient();
      const { data: sess } = await sb!.auth.getSession();
      const token = sess?.session?.access_token;
      const to = ymd(new Date());
      const from = ymd(new Date(Date.now() - (days - 1) * 86400000));
      const res = await fetch(`/api/analytics?from=${from}&to=${to}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (!res.ok) setError(json.error || `Error ${res.status}`);
      else setData(json);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    }
    setLoading(false);
  }, [days]);

  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ padding: '32px 40px 60px', maxWidth: 1100 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 30, fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 6px' }}>Website traffic</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>Live visitor analytics for carsonexports.{data?.from && ` ${data.from} → ${data.to}`}</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {RANGES.map(r => (
            <button key={r.days} onClick={() => setDays(r.days)} style={{
              padding: '8px 14px', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit',
              background: days === r.days ? 'var(--teal)' : 'var(--bg-soft)', color: days === r.days ? 'white' : 'var(--ink)',
              border: '1px solid ' + (days === r.days ? 'var(--teal)' : 'var(--line)'),
            }}>{r.label}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ color: 'var(--muted)', padding: 20 }}>Loading…</div>
      ) : error ? (
        <div style={{ background: '#FDECEC', color: '#A8232C', borderRadius: 12, padding: '16px 18px', fontSize: 14 }}>
          {error}
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 8 }}>
            If this says &ldquo;not configured&rdquo;, add <code>ANALYTICS_API_KEY</code> in Netlify and redeploy.
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 22 }}>
            {(() => {
              const visitors = data?.visitors?.total ?? 0;
              const pageviews = data?.pageviews?.total ?? 0;
              const perVisitor = visitors > 0 ? (pageviews / visitors).toFixed(1) : '—';
              return (
                <>
                  <Kpi label="Unique visitors" value={visitors.toLocaleString()} />
                  <Kpi label="Pageviews" value={pageviews.toLocaleString()} />
                  <Kpi label="Pages / visitor" value={perVisitor} />
                  <Kpi label="Countries" value={(data?.country?.rows?.length ?? 0).toLocaleString()} />
                </>
              );
            })()}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="rg">
            <Panel title="Top pages" stat={data?.page} />
            <Panel title="Top referrers" stat={data?.referrer} transform={cleanReferrer} />
            <Panel title="Countries" stat={data?.country} />
            <Panel title="Devices" stat={data?.device} />
            <Panel title="Browsers" stat={data?.browser} />
            <Panel title="Operating systems" stat={data?.os} />
          </div>
        </>
      )}
    </div>
  );
}
