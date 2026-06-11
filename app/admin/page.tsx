'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { listVehicles, listLeads, listGuides, isSupabaseConfigured } from '@/lib/db';

function StatCard({ label, value, icon, onClick }: { label: string; value: string | number; icon: string; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 16, padding: '22px 24px', textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--teal-tint)', color: 'var(--teal-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={icon as any} size={19} />
        </div>
        <Icon name="arrowRight" size={16} style={{ color: 'var(--muted)' }} />
      </div>
      <div style={{ fontFamily: 'var(--display)', fontSize: 32, fontWeight: 700, letterSpacing: '-.02em', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 6 }}>{label}</div>
    </button>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({ vehicles: 0, available: 0, leads: 0, newLeads: 0, guides: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [vehicles, leads, guides] = await Promise.all([listVehicles({ includeHidden: true }), listLeads(), listGuides({ includeUnpublished: true })]);
      setStats({
        vehicles: vehicles.length,
        available: vehicles.filter(v => (v as any).status !== 'sold' && (v as any).status !== 'hidden').length,
        leads: leads.length,
        newLeads: leads.filter(l => l.status === 'new').length,
        guides: guides.length,
      });
      setLoading(false);
    })();
  }, []);

  return (
    <div style={{ padding: '32px 40px 60px' }}>
      <h1 style={{ fontFamily: 'var(--display)', fontSize: 30, fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 6px' }}>Dashboard</h1>
      <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 28px' }}>Manage your inventory, leads, content, and site settings.</p>

      {!isSupabaseConfigured && (
        <div style={{ background: '#FFF4E5', color: '#8A5400', borderRadius: 12, padding: '16px 18px', fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
          <strong>Demo mode.</strong> Supabase isn’t connected yet, so you’re seeing the built-in starter data and changes can’t be saved. Add your Supabase keys (see <code>supabase/SETUP.md</code>) to go live.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 36 }}>
        <StatCard label="Vehicles listed" value={loading ? '—' : stats.vehicles} icon="car" onClick={() => router.push('/admin/inventory')} />
        <StatCard label="Available now" value={loading ? '—' : stats.available} icon="check" onClick={() => router.push('/admin/inventory')} />
        <StatCard label={`Leads (${stats.newLeads} new)`} value={loading ? '—' : stats.leads} icon="mail" onClick={() => router.push('/admin/leads')} />
        <StatCard label="Published guides" value={loading ? '—' : stats.guides} icon="sparkles" onClick={() => router.push('/admin/guides')} />
      </div>

      <h2 style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 600, margin: '0 0 14px' }}>Quick actions</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        {[
          { label: 'Add a vehicle', icon: 'car', href: '/admin/inventory/new' },
          { label: 'View new leads', icon: 'mail', href: '/admin/leads' },
          { label: 'Edit the hero', icon: 'shield', href: '/admin/settings' },
          { label: 'Write a guide', icon: 'sparkles', href: '/admin/guides/new' },
        ].map(a => (
          <button key={a.label} onClick={() => router.push(a.href)} style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, textAlign: 'left' }}>
            <Icon name={a.icon as any} size={18} style={{ color: 'var(--teal)' }} /> {a.label}
          </button>
        ))}
      </div>
    </div>
  );
}
