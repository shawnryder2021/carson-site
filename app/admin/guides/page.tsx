'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { listGuides, deleteGuide, importStarterGuides, isSupabaseConfigured, AdminGuide } from '@/lib/db';

export default function AdminGuides() {
  const router = useRouter();
  const [guides, setGuides] = useState<AdminGuide[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => { setLoading(true); setGuides(await listGuides({ includeUnpublished: true })); setLoading(false); };
  useEffect(() => { load(); }, []);

  const remove = async (slug: string, title: string) => {
    if (!confirm(`Delete “${title}”?`)) return;
    setBusy(true); const { error } = await deleteGuide(slug); setBusy(false);
    if (error) return alert(error); load();
  };
  const importStarter = async () => {
    setBusy(true); const { error, count } = await importStarterGuides(); setBusy(false);
    if (error) return alert(error); alert(`Imported ${count} guides.`); load();
  };

  return (
    <div style={{ padding: '32px 40px 60px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 30, fontWeight: 600, letterSpacing: '-.02em', margin: 0 }}>Guides</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={importStarter} disabled={busy || !isSupabaseConfigured} className="btn btn-ghost btn-sm"><Icon name="arrowRight" size={13} /> Import starter guides</button>
          <button onClick={() => router.push('/admin/guides/new')} className="btn btn-primary btn-sm"><Icon name="sparkles" size={14} /> New guide</button>
        </div>
      </div>
      <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 24px' }}>{guides.length} guides</p>

      <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
        {loading ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Loading…</div>
        : guides.length === 0 ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>No guides yet.</div>
        : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead><tr style={{ textAlign: 'left', borderBottom: '1px solid var(--line)', color: 'var(--muted)', fontSize: 12 }}>
              <th style={{ padding: '12px 16px', fontWeight: 700 }}>Title</th>
              <th style={{ padding: '12px 16px', fontWeight: 700 }}>Category</th>
              <th style={{ padding: '12px 16px', fontWeight: 700 }}>Status</th>
              <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
            </tr></thead>
            <tbody>
              {guides.map(g => (
                <tr key={g.slug} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ padding: '12px 16px' }}><div style={{ fontWeight: 600 }}>{g.title}</div><div style={{ fontSize: 12, color: 'var(--muted)' }}>/{g.slug}</div></td>
                  <td style={{ padding: '12px 16px' }}>{g.category}</td>
                  <td style={{ padding: '12px 16px' }}><span style={{ fontSize: 12, fontWeight: 700, color: g.published === false ? '#8A8A8A' : '#0F6B2D' }}>{g.published === false ? 'DRAFT' : 'PUBLISHED'}</span></td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <button onClick={() => router.push(`/admin/guides/${g.slug}`)} className="btn btn-ghost btn-sm" style={{ marginRight: 6 }}>Edit</button>
                    <button onClick={() => remove(g.slug, g.title)} disabled={busy} className="btn btn-ghost btn-sm" style={{ color: '#A8232C' }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
