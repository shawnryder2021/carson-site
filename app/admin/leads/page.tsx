'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';
import { listLeads, updateLeadStatus, isSupabaseConfigured, Lead } from '@/lib/db';

const typeLabel: Record<Lead['type'], string> = {
  contact: 'Contact', testdrive: 'Test drive', tradein: 'Trade-in',
  finance: 'Financing', video: 'Video request', delivery: 'Delivery',
  carfinder: 'CarFinder', service: 'Service', page: 'Page form', other: 'Other',
};
const statusColor: Record<Lead['status'], string> = { new: '#1E8FC4', contacted: '#8A5400', closed: '#8A8A8A' };

export default function AdminLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | Lead['status']>('all');

  const load = async () => { setLoading(true); setLeads(await listLeads()); setLoading(false); };
  useEffect(() => { load(); }, []);

  const setStatus = async (id: string, status: Lead['status']) => {
    setLeads(ls => ls.map(l => l.id === id ? { ...l, status } : l));
    await updateLeadStatus(id, status);
  };

  const filtered = filter === 'all' ? leads : leads.filter(l => l.status === filter);

  return (
    <div style={{ padding: '32px 40px 60px' }}>
      <h1 style={{ fontFamily: 'var(--display)', fontSize: 30, fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 6px' }}>Leads</h1>
      <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 24px' }}>Form submissions from across the site.</p>

      {!isSupabaseConfigured && (
        <div style={{ background: '#FFF4E5', color: '#8A5400', borderRadius: 12, padding: '14px 16px', fontSize: 14, marginBottom: 20 }}>
          Connect Supabase to capture and view real leads.
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
        {(['all', 'new', 'contacted', 'closed'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '7px 14px', borderRadius: 999, textTransform: 'capitalize',
            background: filter === f ? 'var(--ink)' : 'white', color: filter === f ? 'white' : 'var(--ink)',
            border: '1px solid ' + (filter === f ? 'var(--ink)' : 'var(--line)'), cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
          }}>{f}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, padding: 48, textAlign: 'center', color: 'var(--muted)' }}>
          <Icon name="mail" size={32} style={{ marginBottom: 12, opacity: 0.5 }} />
          <div>No leads yet.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map(l => (
            <div key={l.id} style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ background: 'var(--teal-tint)', color: 'var(--teal-2)', padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>{typeLabel[l.type]}</span>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>{new Date(l.createdAt).toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600 }}>{l.name || '(no name)'}</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                    {[l.email, l.phone].filter(Boolean).join(' · ') || '—'}
                  </div>
                  {l.payload && Object.keys(l.payload).length > 0 && (
                    <div style={{ marginTop: 10, background: 'var(--bg-soft)', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: 'var(--ink)' }}>
                      {Object.entries(l.payload).map(([k, val]) => (
                        <div key={k} style={{ display: 'flex', gap: 8 }}>
                          <span style={{ color: 'var(--muted)', minWidth: 110, textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}:</span>
                          <span>{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: statusColor[l.status] }}>{l.status.toUpperCase()}</span>
                  <select value={l.status} onChange={e => setStatus(l.id, e.target.value as Lead['status'])} className="select" style={{ width: 'auto', fontSize: 13, padding: '6px 10px' }}>
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
