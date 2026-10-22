import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchArticles, SITE_URL } from '@/lib/serverDb';
import { NEWS_CATEGORIES, categoryBySlug } from '@/lib/news';
import { ArticleCard } from '@/components/ArticleCard';
import { jsonLdSafe } from '@/lib/escapeHtml';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: { category: string } }): Promise<Metadata> {
  const c = categoryBySlug(params.category);
  if (!c) return { title: 'Not found', robots: { index: false } };
  const url = `${SITE_URL}/news/category/${c.slug}`;
  const title = c.slug === 'customer-reviews' ? 'Carson Exports Reviews — What Customers Say' : `${c.name} — Used Car Advice for Nova Scotia`;
  return { title, description: c.blurb, alternates: { canonical: url }, openGraph: { title: `${title} | Carson Exports`, description: c.blurb, url, type: 'website' } };
}

export default async function NewsCategory({ params }: { params: { category: string } }) {
  const c = categoryBySlug(params.category);
  if (!c) notFound();
  const items = (await fetchArticles()).filter(a => a.category === c.name);

  const breadcrumbs = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'News & Guides', item: `${SITE_URL}/news` },
      { '@type': 'ListItem', position: 3, name: c.name, item: `${SITE_URL}/news/category/${c.slug}` },
    ],
  };

  return (
    <div className="page fade-in">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(breadcrumbs) }} />
      <div style={{ background: 'var(--bg-soft)', padding: '40px 0' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <nav style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
            <Link href="/" style={{ color: 'var(--muted)' }}>Home</Link> › <Link href="/news" style={{ color: 'var(--muted)' }}>News & Guides</Link> › <span>{c.name}</span>
          </nav>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 10px' }}>{c.name}</h1>
          <p style={{ fontSize: 16, margin: 0, maxWidth: 760 }}>{c.blurb} {items.length} article{items.length === 1 ? '' : 's'}.</p>
        </div>
      </div>
      <div className="container" style={{ maxWidth: 1200, padding: '32px 20px 70px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {items.map(a => <ArticleCard key={a.slug} a={a} />)}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginTop: 36 }}>
          {NEWS_CATEGORIES.filter(o => o.slug !== c.slug).map(o => <Link key={o.slug} href={`/news/category/${o.slug}`} className="btn btn-ghost btn-sm">{o.name}</Link>)}
        </div>
      </div>
    </div>
  );
}
