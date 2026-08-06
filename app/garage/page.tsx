'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { VehicleCard } from '@/components/VehicleCard';
import { CardGridSkeleton } from '@/components/Skeleton';
import { vehicleImageURL } from '@/data/vehicleImage';
import { fmtPrice, fmtMiles } from '@/lib/format';
import { useSaved } from '@/context/SavedContext';
import { useCompare } from '@/context/CompareContext';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { getBrowserClient } from '@/lib/supabase/client';
import { listVehicles, AdminVehicle, Lead, VehicleWatch } from '@/lib/db';
import { describeRequest, CarRequest } from '@/lib/carMatch';
import { buildRecommendations } from '@/lib/recommend';
import { getRecentlyViewed } from '@/lib/recentlyViewed';
import {
  listMyWatches, deleteMyWatch, listMyLeads, listMyCarRequests,
  setMyCarRequestActive, deleteMyCarRequest, getMyProfile, saveMyProfile, GarageProfile,
} from '@/lib/garage';

type Tab = 'saved' | 'watches' | 'requests' | 'profile';

const LEAD_LABELS: Record<string, string> = {
  contact: 'Contact', testdrive: 'Test drive', tradein: 'Trade-in', finance: 'Financing',
  video: 'Video request', delivery: 'Delivery', carfinder: 'CarFinder', service: 'Service',
  page: 'Inquiry', other: 'Other',
};

const STATUS_CHIP: Record<string, { label: string; bg: string; color: string }> = {
  new: { label: 'Received', bg: 'var(--teal-tint)', color: 'var(--teal-2)' },
  contacted: { label: 'In progress', bg: '#FFF4E5', color: '#8A5400' },
  closed: { label: 'Done', bg: 'rgba(0,180,80,0.12)', color: '#0F6B2D' },
};

function photoOf(v: AdminVehicle): string {
  return (v as any).images?.[0] || vehicleImageURL(v, { size: 200 });
}

function GarageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { user } = useCustomerAuth();
  const { saved } = useSaved();
  const { setCompare } = useCompare();

  const tabParam = params.get('tab') as Tab | null;
  const [tab, setTab] = useState<Tab>(tabParam && ['saved', 'watches', 'requests', 'profile'].includes(tabParam) ? tabParam : 'saved');

  const [vehicles, setVehicles] = useState<AdminVehicle[]>([]);
  const [watches, setWatches] = useState<VehicleWatch[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [requests, setRequests] = useState<CarRequest[]>([]);
  const [profile, setProfile] = useState<GarageProfile>({ name: '', phone: '', contactPref: 'email', digestOptOut: false });
  const [loading, setLoading] = useState(true);
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileBusy, setProfileBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const [v, w, l, r, p] = await Promise.all([
        listVehicles(), listMyWatches(), listMyLeads(), listMyCarRequests(), getMyProfile(),
      ]);
      setVehicles(v);
      setWatches(w);
      setLeads(l);
      setRequests(r);
      if (p) setProfile(p);
      setLoading(false);
    })();
  }, [user?.id]);

  const byId = useMemo(() => new Map(vehicles.map(v => [v.id, v])), [vehicles]);
  const savedVehicles = saved.map(id => byId.get(id)).filter((v): v is AdminVehicle => !!v && v.status !== 'sold');

  const recommendations = useMemo(() => {
    const signalIds = Array.from(new Set([...saved, ...getRecentlyViewed()]));
    const signals = signalIds.map(id => byId.get(id)).filter((v): v is AdminVehicle => !!v);
    return buildRecommendations(signals, vehicles, new Set(signalIds));
  }, [saved, byId, vehicles]);

  const switchTab = (t: Tab) => {
    setTab(t);
    router.replace(`/garage?tab=${t}`, { scroll: false });
  };

  const unwatch = async (w: VehicleWatch) => {
    if (!w.id) return;
    await deleteMyWatch(w.id);
    localStorage.removeItem(`cx_watch_${w.vehicleId}`);
    setWatches(ws => ws.filter(x => x.id !== w.id));
  };

  const signOut = async () => {
    const sb = getBrowserClient();
    if (sb) await sb.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const submitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileBusy(true);
    setProfileSaved(false);
    const { error } = await saveMyProfile(profile);
    setProfileBusy(false);
    if (!error) {
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 2500);
    }
  };

  const TABS: { key: Tab; label: string; icon: string; count?: number }[] = [
    { key: 'saved', label: 'Saved', icon: 'heart', count: savedVehicles.length },
    { key: 'watches', label: 'Price watches', icon: 'trend', count: watches.length },
    { key: 'requests', label: 'My requests', icon: 'send', count: leads.length + requests.length },
    { key: 'profile', label: 'Profile', icon: 'edit' },
  ];

  return (
    <div className="page fade-in">
      <div className="container" style={{ maxWidth: 1100, padding: '36px 20px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 6 }}>
          <div style={{ width: 46, height: 46, borderRadius: 13, background: 'var(--teal-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name="car" size={24} style={{ color: 'var(--teal-2)' }} />
          </div>
          <div>
            <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(24px,4vw,32px)', fontWeight: 700, letterSpacing: '-.02em', margin: 0, lineHeight: 1.1 }}>My Garage</h1>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>{user?.email}</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--line)', margin: '22px 0 28px', overflowX: 'auto' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => switchTab(t.key)}
              style={{
                background: 'none', border: 'none', padding: '12px 16px', whiteSpace: 'nowrap',
                fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                color: tab === t.key ? 'var(--teal-2)' : 'var(--muted)',
                borderBottom: '2px solid ' + (tab === t.key ? 'var(--teal)' : 'transparent'),
                marginBottom: -1, display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <Icon name={t.icon as any} size={14} /> {t.label}
              {typeof t.count === 'number' && t.count > 0 && (
                <span style={{ background: tab === t.key ? 'var(--teal)' : 'var(--bg-soft)', color: tab === t.key ? 'white' : 'var(--muted)', borderRadius: 999, fontSize: 11, fontWeight: 700, padding: '2px 7px' }}>{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <CardGridSkeleton count={3} />
        ) : (
          <>
            {/* ── SAVED ── */}
            {tab === 'saved' && (
              <div>
                {savedVehicles.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-soft)', borderRadius: 16 }}>
                    <Icon name="heart" size={36} style={{ color: 'var(--muted)', marginBottom: 12 }} />
                    <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 6px' }}>No saved cars yet</h2>
                    <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 20px' }}>Tap the heart on any vehicle and it&apos;ll be waiting here — on every device.</p>
                    <button onClick={() => router.push('/inventory')} className="btn btn-primary">Browse inventory <Icon name="arrowRight" size={14} /></button>
                  </div>
                ) : (
                  <>
                    {savedVehicles.length >= 2 && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
                        <button
                          onClick={() => { setCompare(savedVehicles.slice(0, 3).map(v => v.id)); router.push('/compare'); }}
                          className="btn btn-ghost btn-sm"
                        >
                          Compare saved <Icon name="arrowRight" size={12} />
                        </button>
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
                      {savedVehicles.map(v => <VehicleCard key={v.id} vehicle={v as any} />)}
                    </div>
                  </>
                )}

                {recommendations.length > 0 && (
                  <div style={{ marginTop: 48 }}>
                    <h2 style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 6px' }}>
                      <Icon name="sparkles" size={18} style={{ verticalAlign: '-2px', color: 'var(--teal)', marginRight: 6 }} />Because you saved…
                    </h2>
                    <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: '0 0 18px' }}>Similar cars in stock right now, based on what you&apos;ve saved and viewed.</p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 18 }}>
                      {recommendations.map(v => <VehicleCard key={v.id} vehicle={v as any} />)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── WATCHES ── */}
            {tab === 'watches' && (
              watches.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-soft)', borderRadius: 16 }}>
                  <Icon name="trend" size={36} style={{ color: 'var(--muted)', marginBottom: 12 }} />
                  <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 6px' }}>You&apos;re not watching any cars</h2>
                  <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 20px' }}>Hit &quot;Watch this car&quot; on a vehicle page and we&apos;ll alert you the moment its price drops.</p>
                  <button onClick={() => router.push('/inventory')} className="btn btn-primary">Browse inventory <Icon name="arrowRight" size={14} /></button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {watches.map(w => {
                    const v = byId.get(w.vehicleId);
                    if (!v) return null;
                    const drop = w.lastNotifiedPrice - v.price;
                    return (
                      <div key={w.id} style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'white', border: '1px solid var(--line)', borderRadius: 14, padding: '14px 18px', flexWrap: 'wrap' }}>
                        <div onClick={() => router.push(`/vehicle/${v.id}`)} style={{ width: 76, height: 56, borderRadius: 10, overflow: 'hidden', background: 'var(--bg-soft)', flexShrink: 0, cursor: 'pointer' }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={photoOf(v)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 180 }}>
                          <div onClick={() => router.push(`/vehicle/${v.id}`)} style={{ fontSize: 14.5, fontWeight: 700, cursor: 'pointer' }}>{v.year} {v.make} {v.model}</div>
                          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
                            Watching since {fmtPrice(w.lastNotifiedPrice)} · {fmtMiles(v.mileage)}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 17, fontWeight: 800 }}>{fmtPrice(v.price)}</div>
                          {drop > 0 ? (
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#0F6B2D' }}>
                              <Icon name="trend" size={11} style={{ verticalAlign: '-1px' }} /> {fmtPrice(drop)} below your watch price
                            </div>
                          ) : (
                            <div style={{ fontSize: 12, color: 'var(--muted)' }}>No change yet</div>
                          )}
                        </div>
                        <button onClick={() => unwatch(w)} className="btn btn-ghost btn-sm" title="Stop watching">
                          <Icon name="trash" size={13} /> Un-watch
                        </button>
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* ── REQUESTS ── */}
            {tab === 'requests' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px' }}>Requests &amp; appointments</h2>
                  {leads.length === 0 ? (
                    <p style={{ fontSize: 14, color: 'var(--muted)' }}>Nothing yet — book a test drive or ask about a vehicle and it&apos;ll show up here with live status.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {leads.map(l => {
                        const chip = STATUS_CHIP[l.status] || STATUS_CHIP.new;
                        const v = l.vehicleId ? byId.get(l.vehicleId) : null;
                        return (
                          <div key={l.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'white', border: '1px solid var(--line)', borderRadius: 12, padding: '12px 16px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 13.5, fontWeight: 700, minWidth: 100 }}>{LEAD_LABELS[l.type] || l.type}</span>
                            <span style={{ flex: 1, fontSize: 13, color: 'var(--muted)', minWidth: 140 }}>
                              {v ? `${v.year} ${v.make} ${v.model}` : (l.payload?.vehicle || '—')}
                              {l.type === 'testdrive' && l.payload?.dateLabel && (
                                <span style={{ display: 'block', color: 'var(--teal-2)', fontWeight: 700, fontSize: 12.5, marginTop: 2 }}>
                                  📅 {l.payload.dateLabel} · {l.payload.timeLabel}
                                </span>
                              )}
                            </span>
                            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
                              {new Date(l.createdAt).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}
                            </span>
                            <span style={{ background: chip.bg, color: chip.color, padding: '4px 11px', borderRadius: 999, fontSize: 11.5, fontWeight: 700 }}>{chip.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 12px' }}>CarFinder alerts</h2>
                  {requests.length === 0 ? (
                    <p style={{ fontSize: 14, color: 'var(--muted)' }}>
                      No alerts set. <span onClick={() => router.push('/carfinder')} style={{ color: 'var(--teal-2)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>Tell us what you&apos;re hunting for</span> and we&apos;ll email you when a match arrives.
                    </p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {requests.map(r => (
                        <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'white', border: '1px solid var(--line)', borderRadius: 12, padding: '12px 16px', flexWrap: 'wrap' }}>
                          <Icon name="search" size={15} style={{ color: r.active ? 'var(--teal)' : 'var(--muted)', flexShrink: 0 }} />
                          <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, minWidth: 160, color: r.active ? 'var(--ink)' : 'var(--muted)' }}>{describeRequest(r)}</span>
                          <span style={{ fontSize: 12, color: 'var(--muted)' }}>{r.active ? 'Active' : 'Paused'}</span>
                          <button
                            onClick={async () => { await setMyCarRequestActive(r.id!, !r.active); setRequests(rs => rs.map(x => x.id === r.id ? { ...x, active: !r.active } : x)); }}
                            className="btn btn-ghost btn-sm"
                          >
                            {r.active ? 'Pause' : 'Resume'}
                          </button>
                          <button
                            onClick={async () => { await deleteMyCarRequest(r.id!); setRequests(rs => rs.filter(x => x.id !== r.id)); }}
                            className="btn btn-ghost btn-sm" title="Delete alert"
                          >
                            <Icon name="trash" size={13} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── PROFILE ── */}
            {tab === 'profile' && (
              <form onSubmit={submitProfile} style={{ maxWidth: 460, background: 'white', border: '1px solid var(--line)', borderRadius: 16, padding: '26px 28px' }}>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>Email</div>
                  <input className="input" value={user?.email || ''} disabled style={{ background: 'var(--bg-soft)', color: 'var(--muted)' }} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>Name</div>
                  <input className="input" value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} placeholder="Your name" />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>Phone</div>
                  <input className="input" type="tel" value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} placeholder="(902) 555-0123" />
                </div>
                <div style={{ marginBottom: 22 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>Preferred contact</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['email', 'sms'] as const).map(pref => (
                      <button
                        key={pref} type="button"
                        onClick={() => setProfile(p => ({ ...p, contactPref: pref }))}
                        style={{
                          flex: 1, padding: '10px 6px', borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
                          background: profile.contactPref === pref ? 'var(--ink)' : 'white',
                          color: profile.contactPref === pref ? 'white' : 'var(--ink)',
                          border: '1px solid ' + (profile.contactPref === pref ? 'var(--ink)' : 'var(--line)'),
                        }}
                      >
                        {pref === 'email' ? 'Email' : 'Text (SMS)'}
                      </button>
                    ))}
                  </div>
                </div>
                <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 22, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={!profile.digestOptOut}
                    onChange={e => setProfile(p => ({ ...p, digestOptOut: !e.target.checked }))}
                    style={{ marginTop: 3, width: 16, height: 16, accentColor: 'var(--teal)', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 13.5, lineHeight: 1.5 }}>
                    <span style={{ fontWeight: 600 }}>Email me weekly new-arrival matches</span>
                    <span style={{ display: 'block', color: 'var(--muted)', fontSize: 12.5 }}>A short weekly email with new inventory that matches the cars you&apos;ve saved. Unsubscribe anytime.</span>
                  </span>
                </label>
                <button type="submit" disabled={profileBusy} className="btn btn-primary" style={{ width: '100%' }}>
                  {profileBusy ? 'Saving…' : profileSaved ? <><Icon name="check" size={14} /> Saved</> : 'Save profile'}
                </button>
                <button type="button" onClick={signOut} className="btn btn-ghost" style={{ width: '100%', marginTop: 10 }}>
                  Sign out
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function GaragePage() {
  return (
    <Suspense fallback={<div className="page fade-in" style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--muted)' }}>Loading…</div>}>
      <GarageContent />
    </Suspense>
  );
}
