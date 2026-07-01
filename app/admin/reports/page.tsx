'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Icon } from '@/components/Icon';
import { Kpi, Panel, BarRow } from '@/components/admin/ReportUI';
import { fmtPrice } from '@/lib/format';
import { downloadCsv } from '@/lib/csv';
import { getBrowserClient } from '@/lib/supabase/client';
import { listVehicles, listLeads, getAllPriceHistory, AdminVehicle, Lead } from '@/lib/db';

const DAY = 86400000;

const RANGES = [
  { label: 'This week', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
];

function ymd(d: Date) { return d.toISOString().slice(0, 10); }

type Ga4Data = {
  totals: { sessions: number; pageviews: number; users: number };
  events: Record<string, number>;
  search: { terms: { term: string; count: number }[]; unavailable?: boolean };
} | null;

export default function AdminReports() {
  const [rangeDays, setRangeDays] = useState(30);
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  const [vehicles, setVehicles] = useState<AdminVehicle[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [priceHistory, setPriceHistory] = useState<Array<{ vehicleId: string; price: number; recordedAt: string }>>([]);
  const [loading, setLoading] = useState(true);

  const [ga4, setGa4] = useState<Ga4Data>(null);
  const [ga4Error, setGa4Error] = useState<string | null>(null);
  const [ga4Loading, setGa4Loading] = useState(true);

  const [digestStatus, setDigestStatus] = useState<string | null>(null);
  const [digestBusy, setDigestBusy] = useState(false);

  const { from, to } = useMemo(() => {
    if (useCustom && customFrom && customTo) return { from: customFrom, to: customTo };
    const toDate = new Date();
    const fromDate = new Date(toDate.getTime() - (rangeDays - 1) * DAY);
    return { from: ymd(fromDate), to: ymd(toDate) };
  }, [useCustom, customFrom, customTo, rangeDays]);

  // Supabase-backed data (client-side, filtered locally by range).
  useEffect(() => {
    (async () => {
      setLoading(true);
      const [v, l, ph] = await Promise.all([
        listVehicles({ includeHidden: true }),
        listLeads(),
        getAllPriceHistory(),
      ]);
      setVehicles(v);
      setLeads(l);
      setPriceHistory(ph);
      setLoading(false);
    })();
  }, []);

  // GA4 data (server route, re-fetched when the range changes).
  const loadGa4 = useCallback(async () => {
    setGa4Loading(true);
    setGa4Error(null);
    try {
      const sb = getBrowserClient();
      const { data: sess } = await sb!.auth.getSession();
      const token = sess?.session?.access_token;
      const res = await fetch(`/api/ga4-report?from=${from}&to=${to}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (!res.ok) { setGa4Error(json.error || `Error ${res.status}`); setGa4(null); }
      else setGa4(json);
    } catch (e: any) {
      setGa4Error(e?.message || 'Failed to load GA4 data');
    }
    setGa4Loading(false);
  }, [from, to]);

  useEffect(() => { loadGa4(); }, [loadGa4]);

  const fromTime = new Date(from).getTime();
  const toTime = new Date(to).getTime() + DAY - 1;

  const leadsInRange = leads.filter(l => {
    const t = new Date(l.createdAt).getTime();
    return t >= fromTime && t <= toTime;
  });

  const priceChangesInRange = priceHistory.filter(p => {
    const t = new Date(p.recordedAt).getTime();
    return t >= fromTime && t <= toTime;
  });

  const active = vehicles.filter(v => v.status !== 'sold' && v.status !== 'hidden' && !v.hiddenOverride);
  const soldCount = vehicles.filter(v => v.status === 'sold').length;

  const lotDays = active.map(v => v.createdAt ? Math.max(0, Math.floor((Date.now() - new Date(v.createdAt).getTime()) / DAY)) : null).filter((d): d is number => d !== null);
  const avgDays = lotDays.length ? Math.round(lotDays.reduce((a, b) => a + b, 0) / lotDays.length) : 0;

  const aging = active
    .map(v => ({ v, days: v.createdAt ? Math.max(0, Math.floor((Date.now() - new Date(v.createdAt).getTime()) / DAY)) : 0 }))
    .filter(x => x.days >= 30)
    .sort((a, b) => b.days - a.days);

  const typeCounts: Record<string, number> = {};
  leadsInRange.forEach(l => { typeCounts[l.type] = (typeCounts[l.type] || 0) + 1; });
  const maxType = Math.max(1, ...Object.values(typeCounts));

  const sendTestDigest = async () => {
    setDigestBusy(true);
    setDigestStatus(null);
    try {
      const sb = getBrowserClient();
      const { data: sess } = await sb!.auth.getSession();
      const token = sess?.session?.access_token;
      const res = await fetch('/api/reports/digest', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const json = await res.json();
      if (!res.ok) setDigestStatus(`Failed: ${json.error || res.status}`);
      else if (!json.to) setDigestStatus('No recipient found — set a contact email in Site Settings first.');
      else if (!json.emailConfigured) setDigestStatus(`Recipient resolved to ${json.to}, but RESEND_API_KEY isn't configured yet — email not sent.`);
      else if (json.sent) setDigestStatus(`Sent to ${json.to}${json.ga4Included ? ' (with traffic data)' : ''}.`);
      else setDigestStatus(`Resend rejected the send to ${json.to}.`);
    } catch (e: any) {
      setDigestStatus(e?.message || 'Failed to send');
    }
    setDigestBusy(false);
  };

  const exportLeads = () => downloadCsv('leads.csv', leadsInRange.map(l => ({
    date: l.createdAt, type: l.type, name: l.name || '', email: l.email || '', phone: l.phone || '', vehicleId: l.vehicleId || '', status: l.status,
  })));
  const exportInventory = () => downloadCsv('inventory.csv', vehicles.map(v => ({
    id: v.id, year: v.year, make: v.make, model: v.model, price: v.price, mileage: v.mileage, status: v.status, views: v.views || 0, createdAt: v.createdAt || '',
  })));
  const exportPriceHistory = () => downloadCsv('price-history.csv', priceChangesInRange.map(p => ({
    vehicleId: p.vehicleId, price: p.price, recordedAt: p.recordedAt,
  })));

  const ga4NotConfigured = ga4Error && /not configured/i.test(ga4Error);

  return (
    <div style={{ padding: '32px 40px 60px', maxWidth: 1100 }}>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 30, fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 6px' }}>Reports</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>Leads, inventory, and traffic — {from} → {to}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={exportLeads} className="btn btn-ghost btn-sm"><Icon name="mail" size={13} /> Leads CSV</button>
          <button onClick={exportInventory} className="btn btn-ghost btn-sm"><Icon name="car" size={13} /> Inventory CSV</button>
          <button onClick={exportPriceHistory} className="btn btn-ghost btn-sm"><Icon name="dollar" size={13} /> Price history CSV</button>
          <button onClick={() => window.print()} className="btn btn-dark btn-sm">Print report</button>
        </div>
      </div>

      <div className="no-print" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        {RANGES.map(r => (
          <button key={r.label} onClick={() => { setUseCustom(false); setRangeDays(r.days); }} style={{
            padding: '8px 14px', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit',
            background: !useCustom && rangeDays === r.days ? 'var(--teal)' : 'var(--bg-soft)', color: !useCustom && rangeDays === r.days ? 'white' : 'var(--ink)',
            border: '1px solid ' + (!useCustom && rangeDays === r.days ? 'var(--teal)' : 'var(--line)'),
          }}>{r.label}</button>
        ))}
        <button onClick={() => setUseCustom(true)} style={{
          padding: '8px 14px', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit',
          background: useCustom ? 'var(--teal)' : 'var(--bg-soft)', color: useCustom ? 'white' : 'var(--ink)',
          border: '1px solid ' + (useCustom ? 'var(--teal)' : 'var(--line)'),
        }}>Custom</button>
        {useCustom && (
          <>
            <input type="date" className="input" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={{ width: 'auto', padding: '7px 10px', fontSize: 13 }} />
            <span style={{ alignSelf: 'center', color: 'var(--muted)', fontSize: 13 }}>to</span>
            <input type="date" className="input" value={customTo} onChange={e => setCustomTo(e.target.value)} style={{ width: 'auto', padding: '7px 10px', fontSize: 13 }} />
          </>
        )}
      </div>

      {loading ? (
        <div style={{ color: 'var(--muted)', padding: 20 }}>Loading…</div>
      ) : (
        <div className="report-print-area" style={{ marginTop: 20 }}>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 18 }}>
            <Kpi label="Leads in range" value={String(leadsInRange.length)} />
            <Kpi label="Active vehicles" value={String(active.length)} />
            <Kpi label="Avg. days on lot" value={String(avgDays)} />
            <Kpi label="Sold (current total)" value={String(soldCount)} sub="Snapshot, not date-scoped" />
          </div>

          <div className="rg" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
            {/* Leads & Conversions */}
            <Panel title="Leads & conversions">
              {leadsInRange.length === 0 ? (
                <div style={{ fontSize: 13.5, color: 'var(--muted)' }}>No leads in this range.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).map(([t, n]) => (
                    <BarRow key={t} label={t.charAt(0).toUpperCase() + t.slice(1)} count={n} max={maxType} />
                  ))}
                </div>
              )}
            </Panel>

            {/* Inventory & Pricing */}
            <Panel title="Inventory & pricing">
              <div style={{ fontSize: 13.5, marginBottom: 12 }}>
                <strong>{priceChangesInRange.length}</strong> price change{priceChangesInRange.length === 1 ? '' : 's'} in this range.
              </div>
              {aging.length === 0 ? (
                <div style={{ fontSize: 13.5, color: 'var(--muted)' }}>Nothing aging — every active vehicle is under 30 days. 🎉</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {aging.slice(0, 6).map(({ v, days }) => (
                    <div key={v.id} style={{ display: 'flex', gap: 10, fontSize: 13 }}>
                      <span style={{ fontWeight: 800, color: days >= 60 ? '#A8232C' : '#8A5400', minWidth: 36 }}>{days}d</span>
                      <span>{v.year} {v.make} {v.model} — {fmtPrice(v.price)}</span>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          {/* Traffic & Search Funnel */}
          <Panel title="Traffic & search (Google Analytics)" caption={ga4 ? 'GA4 reporting can lag a few hours behind real-time.' : undefined}>
            {ga4Loading ? (
              <div style={{ fontSize: 13.5, color: 'var(--muted)' }}>Loading…</div>
            ) : ga4NotConfigured ? (
              <div style={{ background: '#FFF4E5', color: '#8A5400', borderRadius: 10, padding: '12px 14px', fontSize: 13.5 }}>
                Connect Google Analytics 4 to see traffic and search data. Add <code>GA4_PROPERTY_ID</code>, <code>GA4_CLIENT_EMAIL</code>, <code>GA4_PRIVATE_KEY</code> in Netlify and redeploy.
              </div>
            ) : ga4Error ? (
              <div style={{ background: '#FDECEC', color: '#A8232C', borderRadius: 10, padding: '12px 14px', fontSize: 13.5 }}>{ga4Error}</div>
            ) : ga4 ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 18 }}>
                  <Kpi label="Sessions" value={ga4.totals.sessions.toLocaleString()} />
                  <Kpi label="Pageviews" value={ga4.totals.pageviews.toLocaleString()} />
                  <Kpi label="Users" value={ga4.totals.users.toLocaleString()} />
                </div>

                <div className="rg" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>Event counts</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {(() => {
                        const maxEvt = Math.max(1, ...Object.values(ga4.events));
                        return Object.entries(ga4.events).map(([name, count]) => (
                          <BarRow key={name} label={name} count={count} max={maxEvt} />
                        ));
                      })()}
                    </div>
                    {/* Simple funnel: search -> view_item -> generate_lead */}
                    <div style={{ marginTop: 16, fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Funnel</div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12.5, flexWrap: 'wrap' }}>
                      <span style={{ background: 'var(--teal-tint)', color: 'var(--teal-2)', padding: '4px 10px', borderRadius: 999, fontWeight: 700 }}>Search {ga4.events.search || 0}</span>
                      <Icon name="arrowRight" size={12} style={{ color: 'var(--muted)' }} />
                      <span style={{ background: 'var(--teal-tint)', color: 'var(--teal-2)', padding: '4px 10px', borderRadius: 999, fontWeight: 700 }}>Viewed {ga4.events.view_item || 0}</span>
                      <Icon name="arrowRight" size={12} style={{ color: 'var(--muted)' }} />
                      <span style={{ background: 'var(--teal)', color: 'white', padding: '4px 10px', borderRadius: 999, fontWeight: 700 }}>Leads {ga4.events.generate_lead || 0}</span>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>Top search terms</div>
                    {ga4.search.unavailable ? (
                      <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                        Register <code>search_term</code> as a custom dimension in GA4 Admin → Custom definitions to unlock this.
                      </div>
                    ) : ga4.search.terms.length === 0 ? (
                      <div style={{ fontSize: 13.5, color: 'var(--muted)' }}>No search terms in this range.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {(() => {
                          const maxTerm = Math.max(1, ...ga4.search.terms.map(t => t.count));
                          return ga4.search.terms.map(t => <BarRow key={t.term} label={t.term} count={t.count} max={maxTerm} color="var(--teal-2)" />);
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </Panel>

          <div className="no-print" style={{ marginTop: 18, background: 'var(--bg-soft)', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>Weekly email digest</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Sent automatically every Monday. Send a test now to confirm it's working.</div>
              </div>
              <button onClick={sendTestDigest} disabled={digestBusy} className="btn btn-primary btn-sm">
                <Icon name="send" size={13} /> {digestBusy ? 'Sending…' : 'Send test digest'}
              </button>
            </div>
            {digestStatus && <div style={{ fontSize: 12.5, marginTop: 8, color: 'var(--ink)' }}>{digestStatus}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
