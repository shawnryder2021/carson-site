'use client';

// Floating bottom tray showing the shopper's compare picks. Hidden on vehicle
// pages (the VDP sticky CTA bar owns that space) and on /compare itself —
// the selection lives in CompareContext either way, nothing is lost.
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Icon } from './Icon';
import { useCompare } from '@/context/CompareContext';
import { listVehicles, AdminVehicle } from '@/lib/db';
import { vehicleImageURL } from '@/data/vehicleImage';

export function CompareTray() {
  const router = useRouter();
  const pathname = usePathname();
  const { compare, removeCompare, clearCompare } = useCompare();
  const [vehicles, setVehicles] = useState<AdminVehicle[]>([]);

  const hidden = !pathname || pathname.startsWith('/vehicle/') || pathname === '/compare';

  // Fetch thumbnails lazily, only once something is selected.
  useEffect(() => {
    if (compare.length > 0 && vehicles.length === 0) {
      listVehicles().then(setVehicles);
    }
  }, [compare.length, vehicles.length]);

  if (hidden || compare.length === 0) return null;

  const byId = new Map(vehicles.map(v => [v.id, v]));
  const canCompare = compare.length >= 2;

  return (
    <div className="compare-tray compare-tray--visible">
      <div className="compare-tray__inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          {compare.map(id => {
            const v = byId.get(id);
            return (
              <span key={id} style={{ position: 'relative', width: 56, height: 44, borderRadius: 10, overflow: 'visible', flexShrink: 0 }}>
                <span style={{ display: 'block', width: '100%', height: '100%', borderRadius: 10, overflow: 'hidden', background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
                  {v && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={(v as any).images?.[0] || vehicleImageURL(v, { size: 100 })}
                      alt={`${v.year} ${v.make} ${v.model}`}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )}
                </span>
                <button
                  onClick={() => removeCompare(id)}
                  aria-label="Remove from compare"
                  style={{
                    position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%',
                    background: 'var(--ink)', color: 'white', border: 'none', cursor: 'pointer',
                    fontSize: 11, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                  }}
                >
                  ×
                </button>
              </span>
            );
          })}
          <span className="compare-tray__label" style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
            {compare.length} of 3 selected{!canCompare && ' — pick one more'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button onClick={clearCompare} className="btn btn-ghost btn-sm">Clear</button>
          <button
            onClick={() => router.push(`/compare?ids=${compare.join(',')}`)}
            disabled={!canCompare}
            className="btn btn-primary btn-sm"
            style={!canCompare ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
          >
            Compare {canCompare && <Icon name="arrowRight" size={13} />}
          </button>
        </div>
      </div>
    </div>
  );
}
