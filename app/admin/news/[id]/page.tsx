'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { HtmlEditor } from '@/components/admin/PageEditor';
import { getArticle, saveArticle, deleteArticle, listVehicles, AdminArticle } from '@/lib/db';
import { NEWS_CATEGORIES } from '@/lib/news';
import { allLocalSearches } from '@/lib/localSearch';

const slugify = (s: string) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const lbl: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.04em' };
const card: React.CSSProperties = { background: 'white', border: '1px solid var(--line)', borderRadius: 14, padding: '16px 18px', marginBottom: 16 };

const BLANK: AdminArticle = {
  slug: '', title: '', seoTitle: '', metaDescription: '', category: 'Buying Guides', excerpt: '', bodyHtml: '',
  image: null, relatedSearch: null, published: false, publishedAt: new Date().toISOString(),
};

function Counter({ n, min, max }: { n: number; min: number; max: number }) {
  const color = n === 0 ? 'var(--muted)' : n > max ? '#A8232C' : n < min ? '#8A5400' : '#0F6B2D';
  return <span style={{ fontSize: 12, fontWeight: 700, color }}>{n} / {max}</span>;
}

export default function EditArticle({ params }: { params: { id: string } }) {
  const router = useRouter();
  const isNew = params.id === 'new';
  const [a, setA] = useState<AdminArticle | null>(isNew ? BLANK : null);
  const [originalSlug, setOriginalSlug] = useState('');
  const [searches, setSearches] = useState<{ slug: string; label: string }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isNew) getArticle(params.id).then(x => { setA(x); setOriginalSlug(x?.slug || ''); });
    listVehicles().then(vs => setSearches(allLocalSearches(vs as any).map(p => ({ slug: p.slug, label: `Used ${p.noun}` }))));
  }, [params.id, isNew]);

  if (!a) return <div style={{ padding: 40, color: 'var(--muted)' }}>Loading…</div>;
  const set = (p: Partial<AdminArticle>) => setA({ ...a, ...p });
  const seoTitle = a.seoTitle || a.title;

  const save = async () => {
    if (!a.title.trim() || !a.slug.trim()) return alert('Title and URL slug are required.');
    setSaving(true);
    const { id, error } = await saveArticle({ ...a, slug: slugify(a.slug) });
    setSaving(false);
    if (error) return alert(error);
    if (isNew && id) router.replace(`/admin/news/${id}`);
    else alert('Saved.');
  };

  const remove = async () => {
    if (!a.id || !confirm(`Delete “${a.title}”? This can’t be undone.`)) return;
    const { error } = await deleteArticle(a.id);
    if (error) return alert(error);
    router.push('/admin/news');
  };

  return (
    <div style={{ padding: '32px 40px 60px', maxWidth: 1000 }}>
      <button onClick={() => router.push('/admin/news')} className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }}><Icon name="arrowLeft" size={13} /> All articles</button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, fontWeight: 600, margin: 0 }}>{isNew ? 'New article' : 'Edit article'}</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {!isNew && a.published && <a href={`/news/${originalSlug}`} target="_blank" rel="noopener" className="btn btn-ghost btn-sm">View live</a>}
          <button onClick={save} disabled={saving} className="btn btn-primary btn-sm">{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>

      <div style={card}>
        <label style={lbl}>Title (H1)</label>
        <input className="input" value={a.title} onChange={e => { const t = e.target.value; set({ title: t, ...(isNew ? { slug: slugify(t) } : {}) }); }} style={{ fontSize: 17, fontWeight: 600 }} />
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginTop: 12 }}>
          <div>
            <label style={lbl}>URL slug</label>
            <input className="input" value={a.slug} onChange={e => set({ slug: e.target.value })} />
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
              /news/{slugify(a.slug) || '…'}
              {!isNew && originalSlug && slugify(a.slug) !== originalSlug && <span style={{ color: '#A8232C' }}> — changing this breaks existing links to the article.</span>}
            </div>
          </div>
          <div>
            <label style={lbl}>Category</label>
            <select className="select" value={a.category} onChange={e => set({ category: e.target.value })}>
              {NEWS_CATEGORIES.map(c => <option key={c.slug}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div style={card}>
        <div style={{ fontWeight: 700, marginBottom: 12 }}>Search appearance</div>
        <label style={lbl}>SEO title <Counter n={seoTitle.length} min={30} max={60} /></label>
        <input className="input" value={a.seoTitle} placeholder={a.title} onChange={e => set({ seoTitle: e.target.value })} />
        <label style={{ ...lbl, marginTop: 12 }}>Meta description <Counter n={a.metaDescription.length} min={120} max={160} /></label>
        <textarea className="input" rows={2} value={a.metaDescription} onChange={e => set({ metaDescription: e.target.value })} />
        <div style={{ marginTop: 14, padding: 14, border: '1px dashed var(--line)', borderRadius: 10, fontFamily: 'arial, sans-serif' }}>
          <div style={{ fontSize: 12, color: '#4d5156' }}>carsonexports.com › news › {slugify(a.slug)}</div>
          <div style={{ fontSize: 19, color: '#1a0dab', margin: '2px 0', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{seoTitle || 'Title'}</div>
          <div style={{ fontSize: 13.5, color: '#4d5156', lineHeight: 1.45 }}>{a.metaDescription.length > 160 ? a.metaDescription.slice(0, 157) + '…' : a.metaDescription || 'Meta description…'}</div>
        </div>
      </div>

      <div style={card}>
        <label style={lbl}>Excerpt (shown on listing cards)</label>
        <textarea className="input" rows={2} value={a.excerpt} onChange={e => set({ excerpt: e.target.value })} />
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginTop: 12 }}>
          <div>
            <label style={lbl}>Featured image URL</label>
            <input className="input" value={a.image || ''} onChange={e => set({ image: e.target.value || null })} placeholder="https://…" />
          </div>
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {a.image && <img src={a.image} alt="" style={{ width: '100%', borderRadius: 8, aspectRatio: '3/2', objectFit: 'cover' }} />}
          </div>
        </div>
        <label style={{ ...lbl, marginTop: 12 }}>Show matching inventory from</label>
        <select className="select" value={a.relatedSearch || ''} onChange={e => set({ relatedSearch: e.target.value || null })}>
          <option value="">— None (general “browse inventory” box) —</option>
          {searches.map(s => <option key={s.slug} value={s.slug}>{s.label}</option>)}
        </select>
      </div>

      <div style={card}>
        <label style={lbl}>Article body</label>
        <HtmlEditor value={a.bodyHtml} onChange={v => set({ bodyHtml: v })} />
      </div>

      <div style={{ ...card, display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600 }}>
          <input type="checkbox" checked={a.published} onChange={e => set({ published: e.target.checked })} /> Published
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          Date
          <input type="date" className="input" style={{ width: 'auto' }} value={a.publishedAt ? a.publishedAt.slice(0, 10) : ''}
            onChange={e => set({ publishedAt: e.target.value ? new Date(e.target.value + 'T12:00:00-04:00').toISOString() : null })} />
        </label>
        {!isNew && (a.legacyUrl
          ? <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 'auto' }}>Imported from the old site, so its old URL redirects here. Unpublish instead of deleting.</span>
          : <button onClick={remove} className="btn btn-ghost btn-sm" style={{ color: '#A8232C', marginLeft: 'auto' }}><Icon name="trash" size={13} /> Delete</button>)}
      </div>
    </div>
  );
}
