'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from './Icon';
import { fmtPrice, estMonthly } from '@/lib/format';
import { vehicleImageURL } from '@/data/vehicleImage';
import { useSaved } from '@/context/SavedContext';
import { getRecentlyViewed, readAndStampLastVisit } from '@/lib/recentlyViewed';
import { AdminVehicle } from '@/lib/db';

// Personalized strip for returning visitors: new-arrival count since their
// last visit + the cars they viewed/saved. Renders nothing for first-timers.
export function WelcomeBack({ vehicles }: { vehicles: AdminVehicle[] }) {
  const router = useRouter();
  const { saved } = useSaved();
  const [mounted, setMounted] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [newCount, setNewCount] = useState(0);

  useEffect(() => {
    setRecent(getRecentlyViewed());
    const prev = readAndStampLastVisit();
    if (prev > 0) {
      const n = vehicles.filter(v => {
        const t = v.createdAt ? new Date(v.createdAt).getTime() : 0;
        return t > prev && (v as any).status !== 'sold';
      }).length;
      setNewCount(n);
    }
    setMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicles.length]);

  if (!mounted) return null;

  const byId = new Map(vehicles.map(v => [v.id, v]));
  const picks = [...recent, ...saved]
    .filter((id, i, a) => a.indexOf(id) === i)
    .map(id => byId.get(id))
    .filter((v): v is AdminVehicle => !!v && (v as any).status !== 'sold')
    .slice(0, 6);

  // First-time visitor with nothing to show → render nothing.
  if (picks.length === 0 && newCount === 0) return null;

  const photo = (v: AdminVehicle) => (v as any).images?.[0] || vehicleImageURL(v, { size: 300 });

  return (
    <section style={{ padding: '40px 0 0' }}>
      <div className="container" style={{ maxWidth: 1200 }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(0,124,146,0.08), rgba(90,138,255,0.05))',
          border: '1px solid var(--line)', borderRadius: 18, padding: '24px 26px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 14, flexWrap: 'wrap', marginBottom: picks.length ? 18 : 0 }}>
            <div>
              <h2 style={{ fontFamily: 'var(--display)', fontSize: 24, fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 4px' }}>
                Welcome back 👋
              </h2>
              <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>
                {newCount > 0
                  ? <><strong style={{ color: 'var(--teal-2)' }}>{newCount} new {newCount === 1 ? 'arrival' : 'arrivals'}</strong> since you were last here{picks.length > 0 ? ' — and here’s where you left off.' : '.'}</>
                  : 'Pick up right where you left off.'}
              </p>
            </div>
            {newCount > 0 && (
              <button className="btn btn-dark btn-sm" onClick={() => router.push('/inventory')}>
                See what&apos;s new <Icon name="arrowRight" size={13} />
              </button>
            )}
          </div>

          {picks.length > 0 && (
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4 }}>
              {picks.map(v => (
                <button
                  key={v.id}
                  onClick={() => router.push(`/vehicle/${v.id}`)}
                  style={{
                    flex: '0 0 auto', width: 200, background: 'white', border: '1px solid var(--line)',
                    borderRadius: 12, overflow: 'hidden', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', padding: 0,
                  }}
                >
                  <div style={{ width: '100%', height: 110, background: 'var(--bg-soft)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo(v)} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <div style={{ padding: '10px 12px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {v.year} {v.make} {v.model}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--teal-2)', marginTop: 2 }}>{fmtPrice(v.price)}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>~${estMonthly(v.price)}/mo</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
