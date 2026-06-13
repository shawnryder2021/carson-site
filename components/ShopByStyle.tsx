'use client';

import { useRouter } from 'next/navigation';
import { Icon } from './Icon';
import { vehicleImageURL } from '@/data/vehicleImage';
import { estMonthly } from '@/lib/format';
import { AdminVehicle } from '@/lib/db';

// Carvana-style "shop popular styles" blocks for the homepage.
// All tiles deep-link into /inventory with real filters.

const BODY_STYLES: { label: string; body: string; blurb: string }[] = [
  { label: 'SUVs', body: 'SUV', blurb: 'Space & capability' },
  { label: 'Trucks', body: 'Truck', blurb: 'Haul & tow' },
  { label: 'Sedans', body: 'Sedan', blurb: 'Comfort & economy' },
  { label: 'Coupes', body: 'Coupe', blurb: 'Style & fun' },
  { label: 'Wagons', body: 'Wagon', blurb: 'Room without the height' },
];

const BUDGETS: { label: string; max: number }[] = [
  { label: 'Under $15k', max: 15000 },
  { label: 'Under $20k', max: 20000 },
  { label: 'Under $30k', max: 30000 },
  { label: 'Under $40k', max: 40000 },
];

const PAYMENTS: { label: string; max: number }[] = [
  { label: 'Under $200/mo', max: 200 },
  { label: 'Under $300/mo', max: 300 },
  { label: 'Under $400/mo', max: 400 },
  { label: 'Under $500/mo', max: 500 },
];

export function ShopByStyle({ vehicles }: { vehicles: AdminVehicle[] }) {
  const router = useRouter();
  const available = vehicles.filter(v => (v as any).status !== 'sold' && (v as any).status !== 'hidden');

  const thumbFor = (body: string): AdminVehicle | undefined => {
    const ofType = available.filter(v => v.body === body);
    return ofType.find(v => (v as any).images?.length) || ofType[0];
  };
  const countFor = (body: string) => available.filter(v => v.body === body).length;

  // Popular makes: by inventory frequency, top 6 with at least one car.
  const makeCounts = new Map<string, number>();
  available.forEach(v => makeCounts.set(v.make, (makeCounts.get(v.make) || 0) + 1));
  const popularMakes = [...makeCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

  const stylesWithStock = BODY_STYLES.filter(s => countFor(s.body) > 0);
  // If the lot is sparse, still show the standard set so the page looks full.
  const styles = stylesWithStock.length >= 3 ? stylesWithStock : BODY_STYLES;

  const photo = (v?: AdminVehicle) => v ? ((v as any).images?.[0] || vehicleImageURL(v, { size: 400 })) : '';

  return (
    <section style={{ padding: '72px 0 0' }}>
      <div className="container" style={{ maxWidth: 1200 }}>
        {/* Shop by body style */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(26px,3.6vw,36px)', fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 8px' }}>
            Shop by style
          </h2>
          <p style={{ fontSize: 15, color: 'var(--muted)', margin: 0 }}>Find the right fit, faster. Pick a type to jump straight in.</p>
        </div>

        <div className="shop-style-grid">
          {styles.map(s => {
            const t = thumbFor(s.body);
            const count = countFor(s.body);
            return (
              <button
                key={s.body}
                onClick={() => router.push(`/inventory?body=${s.body}`)}
                className="shop-style-tile"
              >
                <div className="shop-style-photo">
                  {t ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo(t)} alt={s.label} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--line)' }}>
                      <Icon name="car" size={40} />
                    </div>
                  )}
                </div>
                <div style={{ padding: '12px 14px', textAlign: 'left' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {s.label} <Icon name="arrowRight" size={15} style={{ color: 'var(--teal)' }} />
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
                    {count > 0 ? `${count} available · ${s.blurb}` : s.blurb}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Shop by budget */}
        <div style={{ marginTop: 48 }}>
          <h3 style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 16px' }}>
            Shop by budget
          </h3>
          <div className="shop-budget-grid">
            {BUDGETS.map(b => {
              const count = available.filter(v => v.price <= b.max).length;
              return (
                <button
                  key={b.max}
                  onClick={() => router.push(`/inventory?maxPrice=${b.max}`)}
                  className="shop-budget-tile"
                >
                  <Icon name="dollar" size={20} style={{ color: 'var(--teal)' }} />
                  <div style={{ fontSize: 16, fontWeight: 700, marginTop: 8 }}>{b.label}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{count} car{count === 1 ? '' : 's'}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Shop by monthly payment */}
        <div style={{ marginTop: 48 }}>
          <h3 style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 4px' }}>
            Shop by monthly payment
          </h3>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: '0 0 16px' }}>Estimated at 10% down, 72 months, 7.2% APR.</p>
          <div className="shop-budget-grid">
            {PAYMENTS.map(p => {
              const count = available.filter(v => estMonthly(v.price) <= p.max).length;
              return (
                <button
                  key={p.max}
                  onClick={() => router.push(`/inventory?maxMonthly=${p.max}`)}
                  className="shop-budget-tile"
                >
                  <Icon name="gauge" size={20} style={{ color: 'var(--teal)' }} />
                  <div style={{ fontSize: 16, fontWeight: 700, marginTop: 8 }}>{p.label}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>{count} car{count === 1 ? '' : 's'}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Shop by make */}
        {popularMakes.length >= 3 && (
          <div style={{ marginTop: 48 }}>
            <h3 style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 16px' }}>
              Popular makes
            </h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {popularMakes.map(([make, count]) => (
                <button
                  key={make}
                  onClick={() => router.push(`/inventory?make=${encodeURIComponent(make)}`)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    background: 'white', border: '1px solid var(--line)', borderRadius: 999,
                    padding: '11px 18px', fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
                    cursor: 'pointer', color: 'var(--ink)',
                  }}
                >
                  {make}
                  <span style={{ background: 'var(--bg-soft)', color: 'var(--muted)', borderRadius: 999, padding: '1px 8px', fontSize: 12, fontWeight: 700 }}>{count}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
