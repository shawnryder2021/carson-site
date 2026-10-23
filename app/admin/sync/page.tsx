'use client';

import { Fragment, useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import { RowsSkeleton } from '@/components/Skeleton';
import { SyncButton } from '@/components/admin/SyncButton';
import { listSyncRuns, SyncRun, isSupabaseConfigured } from '@/lib/db';
import { fmtPrice } from '@/lib/format';

// The scheduled job (netlify/functions/scheduled-sync.mjs) runs daily at 06:00 UTC.
function nextScheduledRun(now = new Date()) {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 6, 0, 0));
  if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

const fmtWhen = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

const fmtChange = (c: { field: string; from: any; to: any }) =>
  c.field === 'price' ? `price ${fmtPrice(c.from)} → ${fmtPrice(c.to)}`
    : c.field === 'photos' ? `photos ${c.from} → ${c.to}`
    : c.field === 'on_hold' ? (c.to ? 'put on hold' : 'no longer on hold')
    : `${c.field} ${c.from ?? '—'} → ${c.to ?? '—'}`;

export default function AdminSync() {
  const [runs, setRuns] = useState<SyncRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { runs, error } = await listSyncRuns();
    setRuns(runs);
    setError(error || null);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const last = runs[0];
  const cell: React.CSSProperties = { padding: '12px 16px' };

  return (
    <div style={{ padding: '32px 40px 60px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 30, fontWeight: 600, letterSpacing: '-.02em', margin: 0 }}>Inventory sync</h1>
        <SyncButton onSynced={load} disabled={!isSupabaseConfigured} label="Sync now" />
      </div>
      <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 24px' }}>
        Inventory is copied from carsonexports.com automatically every day. Cars that leave that site are marked sold here.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 24 }}>
        <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Last sync</div>
          {last ? (
            <>
              <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6, color: last.ok ? '#0F6B2D' : '#A8232C' }}>
                {last.ok ? '✓ Succeeded' : '⚠ Failed'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{fmtWhen(last.startedAt)} · {last.trigger === 'admin' ? 'run by an admin' : 'automatic'}</div>
            </>
          ) : <div style={{ fontSize: 14, marginTop: 6, color: 'var(--muted)' }}>{loading ? '…' : 'No syncs recorded yet'}</div>}
        </div>
        <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Next automatic sync</div>
          <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>{fmtWhen(nextScheduledRun().toISOString())}</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>Daily, then customer alerts are sent</div>
        </div>
        {last && (
          <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, padding: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>On carsonexports.com</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 6 }}>{last.fetched} vehicles</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>as of the last sync</div>
          </div>
        )}
      </div>

      {error && (
        <div style={{ background: '#FDECEC', color: '#A8232C', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 14 }}>
          Couldn’t load sync history: {error}. Run supabase/migration-sync-history.sql if this table is new.
        </div>
      )}

      <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
        {loading ? <RowsSkeleton rows={5} /> : runs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>No syncs recorded yet. The next automatic sync will appear here.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--line)', color: 'var(--muted)', fontSize: 12 }}>
                <th style={{ ...cell, fontWeight: 700 }}>When</th>
                <th style={{ ...cell, fontWeight: 700 }}>Result</th>
                <th style={{ ...cell, fontWeight: 700 }}>Added</th>
                <th style={{ ...cell, fontWeight: 700 }}>Updated</th>
                <th style={{ ...cell, fontWeight: 700 }}>Marked sold</th>
                <th style={{ ...cell, fontWeight: 700 }}>Source total</th>
              </tr>
            </thead>
            <tbody>
              {runs.map(r => {
                const d = r.details || {};
                const hasDetails = !!(d.added?.length || d.updated?.length || d.sold?.length || d.missing?.length || r.error);
                const isOpen = open === r.id;
                return (
                  <Fragment key={r.id}>
                    <tr
                      onClick={() => hasDetails && setOpen(isOpen ? null : r.id)}
                      style={{ borderBottom: '1px solid var(--line)', cursor: hasDetails ? 'pointer' : 'default', background: isOpen ? 'var(--bg-soft)' : undefined }}
                    >
                      <td style={cell}>
                        <div style={{ fontWeight: 600 }}>{fmtWhen(r.startedAt)}</div>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.trigger === 'admin' ? 'Run by an admin' : 'Automatic'}</div>
                      </td>
                      <td style={{ ...cell, fontWeight: 700, color: r.ok ? '#0F6B2D' : '#A8232C' }}>{r.ok ? '✓ OK' : '⚠ Failed'}</td>
                      <td style={{ ...cell, color: r.added ? '#0F6B2D' : 'var(--muted)' }}>{r.added ? `+${r.added}` : '—'}</td>
                      <td style={{ ...cell, color: r.updated ? '#8A5400' : 'var(--muted)' }}>{r.updated || '—'}</td>
                      <td style={{ ...cell, color: r.markedSold ? '#A8232C' : 'var(--muted)' }}>{r.markedSold || '—'}</td>
                      <td style={cell}>
                        {r.fetched}
                        {hasDetails && <Icon name={isOpen ? 'chevronUp' : 'chevronDown'} size={14} style={{ marginLeft: 8, verticalAlign: 'middle', color: 'var(--muted)' }} />}
                      </td>
                    </tr>
                    {isOpen && (
                      <tr style={{ borderBottom: '1px solid var(--line)', background: 'var(--bg-soft)' }}>
                        <td colSpan={6} style={{ padding: '4px 16px 16px', fontSize: 13, lineHeight: 1.6 }}>
                          {r.error && <p style={{ color: '#A8232C', fontWeight: 600, margin: '8px 0' }}>{r.error}</p>}
                          <DetailList title="Added" color="#0F6B2D" items={(d.added || []).map(a => ({ key: a.id, href: `/vehicle/${a.id}`, text: a.label, sub: fmtPrice(a.price) }))} />
                          <DetailList title="Updated" color="#8A5400" items={(d.updated || []).map(u => ({ key: u.id, href: `/vehicle/${u.id}`, text: u.label, sub: u.changes.map(fmtChange).join(' · ') || 'details only' }))} />
                          <DetailList title="Marked sold" color="#A8232C" items={(d.sold || []).map(s => ({ key: s.id, href: `/vehicle/${s.id}`, text: s.label }))} />
                          <DetailList title="Missing from the feed (not sold yet)" color="#8A5400" items={(d.missing || []).map(s => ({ key: s.id, href: `/vehicle/${s.id}`, text: s.label }))} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function DetailList({ title, color, items }: { title: string; color: string; items: { key: string; href: string; text: string; sub?: string }[] }) {
  if (!items.length) return null;
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontWeight: 700, color }}>{title} ({items.length})</div>
      <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
        {items.map(i => (
          <li key={i.key}>
            <a href={i.href} target="_blank" rel="noopener" style={{ color: 'var(--ink)' }}>{i.text}</a>
            {i.sub && <span style={{ color: 'var(--muted)' }}> — {i.sub}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
