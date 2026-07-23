'use client';

import { useState, useEffect, useCallback } from 'react';
import { Icon } from '@/components/Icon';
import { RowsSkeleton } from '@/components/Skeleton';
import { getBrowserClient } from '@/lib/supabase/client';

type Booking = {
  id: string;
  slotStart: string;
  dateLabel: string;
  timeLabel: string;
  vehicleTitle: string;
  vehicleId: string | null;
  name: string;
  email: string;
  phone: string;
  status: 'booked' | 'completed' | 'no_show' | 'cancelled';
  isPast: boolean;
};

const STATUS: Record<string, { label: string; bg: string; color: string }> = {
  booked: { label: 'Booked', bg: 'var(--teal-tint)', color: 'var(--teal-2)' },
  completed: { label: 'Completed', bg: 'rgba(15,107,45,0.12)', color: '#0F6B2D' },
  no_show: { label: 'No-show', bg: '#FFF4E5', color: '#8A5400' },
  cancelled: { label: 'Cancelled', bg: 'var(--bg-soft)', color: 'var(--muted)' },
};

export default function AdminBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const token = useCallback(async () => {
    const sb = getBrowserClient();
    const { data } = await sb!.auth.getSession();
    return data?.session?.access_token;
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      const t = await token();
      const res = await fetch('/api/admin/bookings', { headers: t ? { Authorization: `Bearer ${t}` } : {}, cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) setError(json.error || `Error ${res.status}`);
      else setBookings(json.bookings || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load');
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const act = async (id: string, action: 'complete' | 'no_show' | 'cancel') => {
    if (action === 'cancel' && !confirm('Cancel this test drive? The customer and your team will be notified, and the slot frees up.')) return;
    setBusyId(id);
    try {
      const t = await token();
      await fetch('/api/admin/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) },
        body: JSON.stringify({ id, action }),
      });
      await load();
    } catch { /* */ }
    setBusyId(null);
  };

  const upcoming = bookings.filter(b => b.status === 'booked' && !b.isPast);
  const past = bookings.filter(b => !(b.status === 'booked' && !b.isPast)).reverse();

  const Row = ({ b, actions }: { b: Booking; actions: boolean }) => {
    const chip = STATUS[b.status] || STATUS.booked;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'white', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 18px', flexWrap: 'wrap' }}>
        <div style={{ minWidth: 120 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--teal-2)' }}>{b.dateLabel}</div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>{b.timeLabel}</div>
        </div>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700 }}>{b.vehicleTitle}</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
            {b.name || '(no name)'}
            {b.phone && <> · <a href={`tel:${b.phone}`} style={{ color: 'var(--teal-2)' }}>{b.phone}</a></>}
            {b.email && <> · <a href={`mailto:${b.email}`} style={{ color: 'var(--teal-2)' }}>{b.email}</a></>}
          </div>
        </div>
        <span style={{ background: chip.bg, color: chip.color, padding: '4px 11px', borderRadius: 999, fontSize: 11.5, fontWeight: 700 }}>{chip.label}</span>
        {actions && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button disabled={busyId === b.id} onClick={() => act(b.id, 'complete')} className="btn btn-ghost btn-sm">Completed</button>
            <button disabled={busyId === b.id} onClick={() => act(b.id, 'no_show')} className="btn btn-ghost btn-sm">No-show</button>
            <button disabled={busyId === b.id} onClick={() => act(b.id, 'cancel')} className="btn btn-ghost btn-sm" style={{ color: '#A8232C' }}>Cancel</button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: '32px 40px 60px', maxWidth: 1000 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 30, fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 6px' }}>Test Drives</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>{upcoming.length} upcoming · {bookings.length} total</p>
        </div>
        <button onClick={() => { setLoading(true); load(); }} className="btn btn-ghost btn-sm">Refresh</button>
      </div>

      {loading ? (
        <RowsSkeleton rows={4} />
      ) : error ? (
        <div style={{ background: /not configured|SERVICE_ROLE/i.test(error) ? '#FFF4E5' : '#FDECEC', color: /not configured|SERVICE_ROLE/i.test(error) ? '#8A5400' : '#A8232C', borderRadius: 12, padding: '16px 18px', fontSize: 14 }}>{error}</div>
      ) : bookings.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--bg-soft)', borderRadius: 16 }}>
          <Icon name="calendar" size={36} style={{ color: 'var(--muted)', marginBottom: 12 }} />
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>No test drives booked yet</div>
          <div style={{ fontSize: 14, color: 'var(--muted)' }}>Bookings from the vehicle pages will show up here.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', margin: '0 0 12px' }}>Upcoming</h2>
            {upcoming.length === 0 ? (
              <div style={{ fontSize: 13.5, color: 'var(--muted)', padding: '8px 0' }}>No upcoming test drives.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {upcoming.map(b => <Row key={b.id} b={b} actions />)}
              </div>
            )}
          </div>
          {past.length > 0 && (
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', margin: '0 0 12px' }}>Past &amp; closed</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {past.map(b => <Row key={b.id} b={b} actions={false} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
