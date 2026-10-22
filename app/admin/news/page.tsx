'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { RowsSkeleton } from '@/components/Skeleton';
import { listArticles, saveArticle, getArticle, AdminArticle } from '@/lib/db';
import { NEWS_CATEGORIES, fmtArticleDate } from '@/lib/news';

export default function AdminNews() {
  const router = useRouter();
  const [articles, setArticles] = useState<AdminArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');

  const load = async () => {
    setLoading(true);
    setArticles(await listArticles());
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const togglePublished = async (a: AdminArticle) => {
    const full = a.id ? await getArticle(a.id) : null;
    if (!full) return;
    const { error } = await saveArticle({ ...full, published: !a.published });
    if (error) return alert(error);
    setArticles(as => as.map(x => (x.id === a.id ? { ...x, published: !a.published } : x)));
  };

  const shown = articles.filter(a => (!cat || a.category === cat) && `${a.title} ${a.slug}`.toLowerCase().includes(q.toLowerCase()));
  const longTitles = articles.filter(a => (a.seoTitle || a.title).length > 60).length;
  const missingDesc = articles.filter(a => !a.metaDescription).length;

  return (
    <div style={{ padding: '32px 40px 60px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 12 }}>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 30, fontWeight: 600, letterSpacing: '-.02em', margin: 0 }}>News & Guides</h1>
        <button onClick={() => router.push('/admin/news/new')} className="btn btn-primary btn-sm"><Icon name="plus" size={14} /> New article</button>
      </div>
      <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 18px' }}>
        {articles.length} articles · {articles.filter(a => a.published).length} published
        {missingDesc ? ` · ${missingDesc} missing a meta description` : ''}
        {longTitles ? ` · ${longTitles} with an SEO title over 60 characters` : ''}
      </p>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
        <input className="input" placeholder="Search titles…" value={q} onChange={e => setQ(e.target.value)} style={{ maxWidth: 320 }} />
        <select className="select" value={cat} onChange={e => setCat(e.target.value)} style={{ width: 'auto' }}>
          <option value="">All categories</option>
          {NEWS_CATEGORIES.map(c => <option key={c.slug} value={c.name}>{c.name} ({articles.filter(a => a.category === c.name).length})</option>)}
        </select>
      </div>

      <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, overflow: 'hidden' }}>
        {loading ? <RowsSkeleton rows={8} /> : shown.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>No articles match.</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--line)', color: 'var(--muted)', fontSize: 12 }}>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Article</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Category</th>
                <th style={{ padding: '12px 16px', fontWeight: 700 }}>Published</th>
                <th style={{ padding: '12px 16px', fontWeight: 700, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shown.map(a => (
                <tr key={a.id} style={{ borderBottom: '1px solid var(--line)', opacity: a.published ? 1 : 0.55 }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 600 }}>{a.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>/news/{a.slug}{a.legacyUrl ? ' · imported from carsonexports.com' : ''}</div>
                  </td>
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>{a.category}</td>
                  <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>{a.published ? (fmtArticleDate(a.publishedAt) || 'Yes (undated)') : 'Draft'}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {a.published && <a href={`/news/${a.slug}`} target="_blank" rel="noopener" className="btn btn-ghost btn-sm" style={{ marginRight: 6 }}>View</a>}
                    <button onClick={() => togglePublished(a)} className="btn btn-ghost btn-sm" style={{ marginRight: 6 }}>{a.published ? 'Unpublish' : 'Publish'}</button>
                    <button onClick={() => router.push(`/admin/news/${a.id}`)} className="btn btn-ghost btn-sm">Edit</button>
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
