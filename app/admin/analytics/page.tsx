'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { fmtPrice } from '@/lib/format';
import { vehicleImageURL } from '@/data/vehicleImage';
import { listVehicles, listLeads, getAllPriceHistory, isSupabaseConfigured, AdminVehicle, Lead } from '@/lib/db';

const DAY = 86400000;

function daysOnLot(v: AdminVehicle): number | null {
  return v.createdAt ? Math.max(0, Math.floor((Date.now() - new Date(v.createdAt).getTime()) / DAY)) : null;
}

function Kpi({ label, value, sub, subColor }: { label: string; value: string; sub?: string; subColor?: string }) {
  return (
    <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, padding: '18px 22px' }}>
      <div style={{ fontFamily: 'var(--display)', fontSize: 30, fontWeight: 700, letterSpacing: '-.02em', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 6 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4, color: subColor || 'var(--muted)' }}>{sub}</div>}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, padding: '20px 24px' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 14 }}>{title}</div>
      {children}
    </div>
  );
}

export default function AdminAnalytics() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<AdminVehicle[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [priceChanges, setPriceChanges] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [v, l, ph] = await Promise.all([
        listVehicles({ includeHidden: true }),
        listLeads(),
        getAllPriceHistory(),
      ]);
      setVehicles(v);
      setLeads(l);
      // price changes per vehicle = history rows - 1 (first row is the listing price)
      const counts: Record<string, number> = {};
      ph.forEach(p => { counts[p.vehicleId] = (counts[p.vehicleId] || 0) + 1; });
      Object.keys(counts).forEach(k => { counts[k] = Math.max(0, counts[k] - 1); });
      setPriceChanges(counts);
      setLoading(false);
    })();
  }, []);

  if (loading) return <div style={{ padding: 40, color: 'var(--muted)' }}>Loading…</div>;

  const active = vehicles.filter(v => v.status !== 'sold' && v.status !== 'hidden' && !v.hiddenOverride);
  const totalViews = vehicles.reduce((s, v) => s + (v.views || 0), 0);

  const now = Date.now();
  const leadsThisWeek = leads.filter(l => now - new Date(l.createdAt).getTime() < 7 * DAY).length;
  const leadsPrevWeek = leads.filter(l => {
    const age = now - new Date(l.createdAt).getTime();
    return age >= 7 * DAY && age < 14 * DAY;
  }).length;
  const delta = leadsThisWeek - leadsPrevWeek;

  const lotDays = active.map(daysOnLot).filter((d): d is number => d !== null);
  const avgDays = lotDays.length ? Math.round(lotDays.reduce((a, b) => a + b, 0) / lotDays.length) : 0;

  const leadsByVehicle: Record<string, number> = {};
  leads.forEach(l => { if (l.vehicleId) leadsByVehicle[l.vehicleId] = (leadsByVehicle[l.vehicleId] || 0) + 1; });

  const topViewed = [...vehicles].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 8);
  const maxViews = Math.max(1, topViewed[0]?.views || 0);

  const aging = active
    .map(v => ({ v, days: daysOnLot(v) ?? 0 }))
    .filter(x => x.days >= 30)
    .sort((a, b) => b.days - a.days);

  // Leads per week, last 8 weeks (oldest first)
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const start = now - (8 - i) * 7 * DAY;
    const end = start + 7 * DAY;
    const count = leads.filter(l => {
      const t = new Date(l.createdAt).getTime();
      return t >= start && t < end;
    }).length;
    return { label: i === 7 ? 'This wk' : `-${7 - i}w`, count };
  });
  const maxWeek = Math.max(1, ...weeks.map(w => w.count));

  const typeCounts: Record<string, number> = {};
  leads.forEach(l => { typeCounts[l.type] = (typeCounts[l.type] || 0) + 1; });

  return (
    <div style={{ padding: '32px 40px 60px', maxWidth: 1100 }}>
      <h1 style={{ fontFamily: 'var(--display)', fontSize: 30, fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 6px' }}>Analytics</h1>
      <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 24px' }}>How your inventory and leads are performing.</p>

      {!isSupabaseConfigured && (
        <div style={{ background: '#FFF4E5', color: '#8A5400', borderRadius: 12, padding: '14px 16px', fontSize: 14, marginBottom: 20 }}>
          Connect Supabase to see real analytics.
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        <Kpi label="Active vehicles" value={String(active.length)} />
        <Kpi label="Total vehicle views" value={totalViews.toLocaleString()} />
        <Kpi
          label="Leads — last 7 days"
          value={String(leadsThisWeek)}
          sub={delta === 0 ? 'same as last week' : `${delta > 0 ? '▲' : '▼'} ${Math.abs(delta)} vs last week`}
          subColor={delta > 0 ? '#0F6B2D' : delta < 0 ? '#A8232C' : undefined}
        />
        <Kpi label="Avg. days on lot" value={String(avgDays)} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 18, marginBottom: 18 }}>
        {/* Top viewed */}
        <Panel title="Most viewed vehicles">
          {topViewed.every(v => !(v.views || 0)) ? (
            <div style={{ fontSize: 13.5, color: 'var(--muted)' }}>No views recorded yet — counts start as shoppers open vehicle pages.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {topViewed.map(v => (
                <div key={v.id} onClick={() => router.push(`/admin/inventory/${v.id}`)} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                  <span style={{ width: 52, height: 36, borderRadius: 7, overflow: 'hidden', background: 'var(--bg-soft)', flexShrink: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={(v as any).images?.[0] || vehicleImageURL(v, { size: 100 })} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {v.year} {v.make} {v.model}
                    </div>
                    <div style={{ height: 6, background: 'var(--bg-soft)', borderRadius: 999, marginTop: 4 }}>
                      <div style={{ height: 6, width: `${Math.round(((v.views || 0) / maxViews) * 100)}%`, background: 'var(--teal)', borderRadius: 999 }} />
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{v.views || 0} views</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{leadsByVehicle[v.id] || 0} leads</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Leads per week */}
        <Panel title="Leads — last 8 weeks">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 130, marginBottom: 8 }}>
            {weeks.map((w, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: w.count ? 'var(--ink)' : 'var(--muted)' }}>{w.count || ''}</div>
                <div style={{
                  width: '100%', borderRadius: '6px 6px 2px 2px',
                  height: `${Math.max(4, Math.round((w.count / maxWeek) * 96))}px`,
                  background: i === 7 ? 'var(--teal)' : 'rgba(0,124,146,0.25)',
                }} />
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>{w.label}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, borderTop: '1px solid var(--line)', paddingTop: 12 }}>
            {Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).map(([t, n]) => (
              <span key={t} style={{ background: 'var(--teal-tint)', color: 'var(--teal-2)', padding: '4px 10px', borderRadius: 999, fontSize: 11.5, fontWeight: 700, textTransform: 'capitalize' }}>
                {t}: {n}
              </span>
            ))}
            {leads.length === 0 && <span style={{ fontSize: 13, color: 'var(--muted)' }}>No leads yet.</span>}
          </div>
        </Panel>
      </div>

      {/* Aging stock */}
      <Panel title="Aging stock (30+ days)">
        {aging.length === 0 ? (
          <div style={{ fontSize: 13.5, color: 'var(--muted)' }}>Nothing aging — every active vehicle is under 30 days. 🎉</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {aging.map(({ v, days }, i) => {
              const changes = priceChanges[v.id] || 0;
              const stale = days >= 60 && changes === 0;
              return (
                <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 0', borderBottom: i < aging.length - 1 ? '1px solid var(--line)' : 'none' }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: days >= 60 ? '#A8232C' : '#8A5400', minWidth: 44 }}>{days}d</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600 }}>{v.year} {v.make} {v.model}</span>
                    <span style={{ fontSize: 12.5, color: 'var(--muted)', marginLeft: 10 }}>
                      {fmtPrice(v.price)} · {v.views || 0} views · {changes} price change{changes === 1 ? '' : 's'}
                    </span>
                    {stale && (
                      <span style={{ marginLeft: 10, fontSize: 11.5, fontWeight: 700, color: '#A8232C' }}>
                        <Icon name="trend" size={11} style={{ verticalAlign: '-1px', marginRight: 3 }} />consider a price adjustment
                      </span>
                    )}
                  </div>
                  <button onClick={() => router.push(`/admin/inventory/${v.id}`)} className="btn btn-ghost btn-sm">Edit</button>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
