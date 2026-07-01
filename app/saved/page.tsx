'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { VehicleCard } from '@/components/VehicleCard';
import { useSaved } from '@/context/SavedContext';
import { useCustomerAuth } from '@/context/CustomerAuthContext';
import { listVehicles, AdminVehicle } from '@/lib/db';

export default function SavedPage() {
  const router = useRouter();
  const { saved } = useSaved();
  const { user } = useCustomerAuth();
  const [vehicles, setVehicles] = useState<AdminVehicle[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { listVehicles().then(v => { setVehicles(v); setLoaded(true); }); }, []);

  const savedVehicles = vehicles.filter(v => saved.includes(v.id));

  return (
    <div className="page fade-in">
      <div className="container" style={{ maxWidth: 1200, padding: '40px 20px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <Icon name="heart" size={24} style={{ color: 'var(--teal)' }} />
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(28px,4vw,40px)', fontWeight: 600, letterSpacing: '-.02em', margin: 0 }}>Saved vehicles</h1>
        </div>
        <p style={{ fontSize: 15, color: 'var(--muted)', margin: '0 0 16px' }}>
          {savedVehicles.length > 0
            ? `${savedVehicles.length} vehicle${savedVehicles.length === 1 ? '' : 's'} you've saved. Tap the heart on any car to add or remove it.`
            : 'Tap the heart on any vehicle to save it here for later.'}
        </p>

        {!user && (
          <div style={{ background: 'var(--teal-tint)', borderRadius: 12, padding: '12px 16px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Icon name="car" size={16} style={{ color: 'var(--teal-2)', flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 13.5, color: 'var(--teal-2)', minWidth: 200 }}>
              Sign in to sync your saved cars across devices — free, takes 20 seconds.
            </span>
            <button className="btn btn-primary btn-sm" onClick={() => router.push('/garage/login?next=/saved')}>
              Sign in <Icon name="arrowRight" size={13} />
            </button>
          </div>
        )}

        {!loaded ? (
          <div style={{ color: 'var(--muted)' }}>Loading…</div>
        ) : savedVehicles.length === 0 ? (
          <div style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', borderRadius: 18, padding: '50px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>🤍</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>No saved vehicles yet</div>
            <div style={{ fontSize: 14.5, color: 'var(--muted)', marginBottom: 20, maxWidth: 440, marginInline: 'auto', lineHeight: 1.6 }}>
              Browse the lot and tap the ♡ on any car to keep it here — {user ? 'your shortlist syncs to your garage on every device.' : 'your shortlist stays on this device.'}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => router.push('/inventory')}>Browse inventory</button>
              <button className="btn btn-ghost" onClick={() => router.push('/inventory-search')}><Icon name="sparkles" size={14} /> Find my car with AI</button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 24 }}>
            {savedVehicles.map(v => <VehicleCard key={v.id} vehicle={v} />)}
          </div>
        )}
      </div>
    </div>
  );
}
