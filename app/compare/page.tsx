'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { RowsSkeleton } from '@/components/Skeleton';
import { vehicleImageURL } from '@/data/vehicleImage';
import { fmtPrice, fmtMiles, estMonthly } from '@/lib/format';
import { useCompare } from '@/context/CompareContext';
import { listVehicles, AdminVehicle } from '@/lib/db';
import { gaEvent } from '@/lib/gtag';
import { TERMS_LABEL } from '@/lib/payment';

const DAY = 86400000;

function daysOnLot(v: AdminVehicle): number | null {
  return v.createdAt ? Math.max(0, Math.floor((Date.now() - new Date(v.createdAt).getTime()) / DAY)) : null;
}

// Spec rows. `numeric` marks rows that get a best-value highlight:
// the winning cell (min or max, no ties) is tinted with a check icon.
type Row = {
  label: string;
  sub?: string;
  value: (v: AdminVehicle) => string;
  numeric?: { of: (v: AdminVehicle) => number | null; best: 'min' | 'max' };
};

const ROWS: Row[] = [
  { label: 'Price', value: v => fmtPrice(v.price), numeric: { of: v => v.price, best: 'min' } },
  { label: 'Est. payment', sub: TERMS_LABEL, value: v => `$${estMonthly(v.price)}/mo`, numeric: { of: v => estMonthly(v.price), best: 'min' } },
  { label: 'Kilometres', value: v => fmtMiles(v.mileage), numeric: { of: v => v.mileage, best: 'min' } },
  { label: 'Year', value: v => String(v.year), numeric: { of: v => v.year, best: 'max' } },
  { label: 'Body', value: v => v.body },
  { label: 'Fuel', value: v => v.fuel },
  { label: 'Drive', value: v => v.drive },
  { label: 'Exterior', value: v => v.exterior || '—' },
  { label: 'Interior', value: v => v.interior || '—' },
  { label: 'Days on lot', value: v => { const d = daysOnLot(v); return d === null ? '—' : `${d} day${d === 1 ? '' : 's'}`; }, numeric: { of: daysOnLot, best: 'min' } },
];

function bestIndex(row: Row, vehicles: AdminVehicle[]): number | null {
  if (!row.numeric || vehicles.length < 2) return null;
  const vals = vehicles.map(row.numeric.of);
  if (vals.some(x => x === null)) return null;
  const nums = vals as number[];
  const target = row.numeric.best === 'min' ? Math.min(...nums) : Math.max(...nums);
  const winners = nums.filter(n => n === target);
  if (winners.length !== 1) return null; // skip ties
  return nums.indexOf(target);
}

function photoOf(v: AdminVehicle): string {
  return (v as any).images?.[0] || vehicleImageURL(v, { size: 400 });
}

function CompareContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { compare, setCompare, removeCompare } = useCompare();

  const [all, setAll] = useState<AdminVehicle[]>([]);
  const [loaded, setLoaded] = useState(false);
  const seededFromUrl = useRef(false);
  const firedIds = useRef('');

  // URL is authoritative on first load; afterwards context drives the URL.
  useEffect(() => {
    if (seededFromUrl.current) return;
    seededFromUrl.current = true;
    const urlIds = (params.get('ids') || '').split(',').map(s => s.trim()).filter(Boolean);
    if (urlIds.length > 0) setCompare(urlIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { listVehicles().then(v => { setAll(v); setLoaded(true); }); }, []);

  // Keep the URL shareable as the selection changes.
  useEffect(() => {
    if (!seededFromUrl.current) return;
    const target = compare.length > 0 ? `/compare?ids=${compare.join(',')}` : '/compare';
    router.replace(target, { scroll: false });
  }, [compare, router]);

  const byId = new Map(all.map(v => [v.id, v]));
  const vehicles = compare
    .map(id => byId.get(id))
    .filter((v): v is AdminVehicle => !!v && v.status !== 'sold' && v.status !== 'hidden' && !v.hiddenOverride);

  // GA4: one event per distinct comparison set.
  useEffect(() => {
    if (vehicles.length < 2) return;
    const key = vehicles.map(v => v.id).join(',');
    if (firedIds.current === key) return;
    firedIds.current = key;
    gaEvent('compare_vehicles', { item_ids: key, count: vehicles.length });
  }, [vehicles]);

  const cols = vehicles.length + (vehicles.length === 2 ? 1 : 0); // dashed add-column when 2
  const gridTemplate = `140px repeat(${Math.max(cols, 1)}, minmax(200px, 1fr))`;

  const labelCell: React.CSSProperties = {
    position: 'sticky', left: 0, zIndex: 1, background: 'white',
    padding: '14px 16px', fontSize: 12.5, fontWeight: 700, color: 'var(--muted)',
    borderBottom: '1px solid var(--line)', display: 'flex', flexDirection: 'column', justifyContent: 'center',
  };
  const valueCell: React.CSSProperties = {
    padding: '14px 16px', fontSize: 14, borderBottom: '1px solid var(--line)',
    display: 'flex', alignItems: 'center', gap: 6,
  };

  return (
    <div className="page fade-in">
      <div className="container" style={{ maxWidth: 1100, padding: '36px 20px 80px' }}>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(26px,4vw,36px)', fontWeight: 700, letterSpacing: '-.02em', margin: '0 0 6px' }}>Compare vehicles</h1>
        <p style={{ fontSize: 14.5, color: 'var(--muted)', margin: '0 0 26px' }}>
          Side by side, up to three at a time. Tap the <Icon name="plus" size={12} style={{ verticalAlign: '-1px' }} /> on any vehicle card to add it here.
        </p>

        {!loaded ? (
          <RowsSkeleton rows={4} />
        ) : vehicles.length < 2 ? (
          <div style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', borderRadius: 18, padding: '50px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>⚖️</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>
              {vehicles.length === 1 ? 'Pick one more to compare' : 'Nothing to compare yet'}
            </div>
            <div style={{ fontSize: 14.5, color: 'var(--muted)', marginBottom: 20, maxWidth: 440, marginInline: 'auto', lineHeight: 1.6 }}>
              Add two or three vehicles using the <Icon name="plus" size={12} style={{ verticalAlign: '-1px' }} /> button on any vehicle card, then come back here.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => router.push('/inventory')}>Browse inventory</button>
              <button className="btn btn-ghost" onClick={() => router.push('/saved')}><Icon name="heart" size={14} /> Saved vehicles</button>
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto', border: '1px solid var(--line)', borderRadius: 16, background: 'white' }}>
            <div style={{ display: 'grid', gridTemplateColumns: gridTemplate, minWidth: 140 + cols * 200 }}>
              {/* Header row */}
              <div style={{ ...labelCell, borderBottom: '1px solid var(--line)' }} />
              {vehicles.map(v => (
                <div key={v.id} style={{ padding: 16, borderBottom: '1px solid var(--line)', position: 'relative' }}>
                  <button
                    onClick={() => removeCompare(v.id)}
                    aria-label="Remove from comparison"
                    style={{
                      position: 'absolute', top: 10, right: 10, width: 30, height: 30, borderRadius: '50%',
                      background: 'white', border: '1px solid var(--line)', cursor: 'pointer', zIndex: 2,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: 'var(--muted)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    }}
                  >
                    ×
                  </button>
                  <div
                    onClick={() => router.push(`/vehicle/${v.id}`)}
                    style={{ aspectRatio: '16/10', borderRadius: 12, overflow: 'hidden', background: 'var(--bg-soft)', marginBottom: 12, cursor: 'pointer' }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoOf(v)} alt={`${v.year} ${v.make} ${v.model}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10, lineHeight: 1.3 }}>
                    {v.year} {v.make} {v.model}
                  </div>
                  <button onClick={() => router.push(`/vehicle/${v.id}`)} className="btn btn-ghost btn-sm">
                    View details <Icon name="arrowRight" size={12} />
                  </button>
                </div>
              ))}
              {vehicles.length === 2 && (
                <div style={{ padding: 16, borderBottom: '1px solid var(--line)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                  <div style={{ width: '100%', aspectRatio: '16/10', borderRadius: 12, border: '2px dashed var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="plus" size={26} style={{ color: 'var(--muted)' }} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>Add another vehicle</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => router.push('/inventory')} className="btn btn-ghost btn-sm">Inventory</button>
                    <button onClick={() => router.push('/saved')} className="btn btn-ghost btn-sm">Saved</button>
                  </div>
                </div>
              )}

              {/* Spec rows */}
              {ROWS.map(row => {
                const winner = bestIndex(row, vehicles);
                return (
                  <div key={row.label} style={{ display: 'contents' }}>
                    <div style={labelCell}>
                      {row.label}
                      {row.sub && <span style={{ fontSize: 10.5, fontWeight: 500 }}>{row.sub}</span>}
                    </div>
                    {vehicles.map((v, i) => (
                      <div key={v.id} style={{ ...valueCell, background: winner === i ? 'var(--teal-tint)' : undefined, fontWeight: winner === i ? 700 : 400 }}>
                        {row.value(v)}
                        {winner === i && <Icon name="check" size={12} style={{ color: 'var(--teal-2)', flexShrink: 0 }} />}
                      </div>
                    ))}
                    {vehicles.length === 2 && <div style={{ ...valueCell, color: 'var(--line)' }} />}
                  </div>
                );
              })}

              {/* Summary row (taller, muted) */}
              <div style={{ ...labelCell, borderBottom: 'none' }}>Summary</div>
              {vehicles.map(v => (
                <div key={v.id} style={{ padding: '14px 16px', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.55 }}>
                  {v.aiSummary || '—'}
                </div>
              ))}
              {vehicles.length === 2 && <div />}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="page fade-in" style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--muted)' }}>Loading…</div>}>
      <CompareContent />
    </Suspense>
  );
}
