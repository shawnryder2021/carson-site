'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { listPages, deletePage, savePage, isSupabaseConfigured, CustomPage } from '@/lib/db';

export default function AdminPages() {
  const router = useRouter();
  const [pages, setPages] = useState<CustomPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => { setPages(await listPages({ includeUnpublished: true })); setLoading(false); };
  useEffect(() => { load(); }, []);

  const togglePublish = async (p: CustomPage) => {
    setBusy(true);
    await savePage({ ...p, published: p.published === false });
    await load();
    setBusy(false);
  };

  const remove = async (p: CustomPage) => {
    if (!confirm(`Delete "${p.title}"? This can’t be undone.`)) return;
    setBusy(true);
    await deletePage(p.slug);
    await load();
    setBusy(false);
  };

  return (
    <div style={{ padding: '32px 40px 60px', maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 30, fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 6px' }}>Pages</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>Build custom pages with HTML, inventory grids, and lead forms. Add them to the menu under Navigation.</p>
        </div>
        <button onClick={() => router.push('/admin/pages/new')} disabled={!isSupabaseConfigured} className="btn btn-primary btn-sm"><Icon name="plus" size={14} /> New page</button>
      </div>

      {!isSupabaseConfigured && (
        <div style={{ background: '#FFF4E5', color: '#8A5400', borderRadius: 12, padding: '14px 16px', fontSize: 14, marginBottom: 20 }}>Connect Supabase to create pages.</div>
      )}

      {loading ? (
        <div style={{ color: 'var(--muted)' }}>Loading…</div>
      ) : pages.length === 0 ? (
        <div style={{ background: 'var(--bg-soft)', borderRadius: 14, padding: 40, textAlign: 'center' }}>
          <Icon name="edit" size={28} style={{ opacity: 0.3, marginBottom: 10 }} />
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>No custom pages yet</div>
          <div style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 16 }}>Create a Service page, a specials page, or anything else.</div>
          <button onClick={() => router.push('/admin/pages/new')} className="btn btn-primary btn-sm">Create your first page</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {pages.map(p => (
            <div key={p.slug} style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', opacity: p.published === false ? 0.6 : 1 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{p.title} {p.published === false && <span style={{ fontSize: 11.5, fontWeight: 700, color: '#8A5400' }}>· draft</span>}</div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>/p/{p.slug} · {p.blocks.length} block{p.blocks.length === 1 ? '' : 's'}</div>
              </div>
              <button onClick={() => togglePublish(p)} disabled={busy} className="btn btn-ghost btn-sm">{p.published === false ? 'Publish' : 'Unpublish'}</button>
              <a href={`/p/${p.slug}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm" style={{ textDecoration: 'none' }}>View</a>
              <button onClick={() => router.push(`/admin/pages/${p.slug}`)} className="btn btn-ghost btn-sm">Edit</button>
              <button onClick={() => remove(p)} disabled={busy} className="btn btn-ghost btn-sm" style={{ color: '#A8232C' }}>Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
