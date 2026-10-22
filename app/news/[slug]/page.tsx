import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchArticle, fetchArticles, fetchVehicles, SITE_URL } from '@/lib/serverDb';
import { categorySlug, fmtArticleDate } from '@/lib/news';
import { findLocalSearch, resultsFor } from '@/lib/localSearch';
import { sanitizeHtml } from '@/lib/sanitizeHtml';
import { jsonLdSafe } from '@/lib/escapeHtml';
import { ArticleCard } from '@/components/ArticleCard';
import { LocalResultsGrid } from '@/components/LocalResultsGrid';
import type { Vehicle } from '@/data/inventory';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const a = await fetchArticle(params.slug);
  if (!a) return { title: 'Article not found', robots: { index: false } };
  const url = `${SITE_URL}/news/${a.slug}`;
  // Google shows ~60 characters; drop the " | Carson Exports" suffix when it would push the title past that.
  const withBrand = `${a.seoTitle} | Carson Exports`.length <= 60;
  return {
    title: withBrand ? a.seoTitle : { absolute: a.seoTitle },
    description: a.metaDescription,
    alternates: { canonical: url },
    openGraph: {
      title: `${a.seoTitle} | Carson Exports`, description: a.metaDescription, url, type: 'article',
      publishedTime: a.publishedAt || undefined, modifiedTime: a.updatedAt, images: a.image ? [{ url: a.image }] : undefined,
    },
    twitter: { card: a.image ? 'summary_large_image' : 'summary', title: a.seoTitle, description: a.metaDescription, images: a.image ? [a.image] : undefined },
  };
}

export default async function NewsArticle({ params }: { params: { slug: string } }) {
  const [a, all, vehicles] = await Promise.all([fetchArticle(params.slug), fetchArticles(), fetchVehicles()]);
  if (!a) notFound();

  const url = `${SITE_URL}/news/${a.slug}`;
  const catSlug = categorySlug(a.category);
  const related = all.filter(x => x.slug !== a.slug && x.category === a.category).slice(0, 3);

  // Inventory tie-in: up to 3 cars from the article's /used page.
  const search = a.relatedSearch ? findLocalSearch(a.relatedSearch, vehicles) : undefined;
  const matches = search ? resultsFor(search, vehicles) : [];

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: a.title,
      description: a.metaDescription,
      image: a.image ? [a.image] : undefined,
      datePublished: a.publishedAt || undefined,
      dateModified: a.updatedAt,
      mainEntityOfPage: url,
      author: { '@type': 'Organization', name: 'Carson Exports', url: SITE_URL },
      publisher: { '@type': 'Organization', name: 'Carson Exports', logo: { '@type': 'ImageObject', url: `${SITE_URL}/carson-logo.png` } },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'News & Guides', item: `${SITE_URL}/news` },
        { '@type': 'ListItem', position: 3, name: a.category, item: `${SITE_URL}/news/category/${catSlug}` },
        { '@type': 'ListItem', position: 4, name: a.title, item: url },
      ],
    },
  ];

  return (
    <div className="page fade-in">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(jsonLd) }} />
      <article className="container" style={{ maxWidth: 820, padding: '32px 20px 20px' }}>
        <nav style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
          <Link href="/" style={{ color: 'var(--muted)' }}>Home</Link> ›{' '}
          <Link href="/news" style={{ color: 'var(--muted)' }}>News & Guides</Link> ›{' '}
          <Link href={`/news/category/${catSlug}`} style={{ color: 'var(--muted)' }}>{a.category}</Link>
        </nav>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(28px, 4.4vw, 44px)', fontWeight: 600, letterSpacing: '-.02em', lineHeight: 1.15, margin: '0 0 12px' }}>{a.title}</h1>
        {a.publishedAt && <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 22 }}>Carson Exports · {fmtArticleDate(a.publishedAt)}</div>}
        {a.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.image} alt={a.title} style={{ width: '100%', borderRadius: 16, marginBottom: 26, display: 'block' }} />
        )}
        <div className="page-html" dangerouslySetInnerHTML={{ __html: sanitizeHtml(a.bodyHtml) }} />
      </article>

      <div className="container" style={{ maxWidth: 1100, padding: '10px 20px 20px' }}>
        {search && matches.length > 0 ? (
          <section style={{ background: 'var(--bg-soft)', borderRadius: 18, padding: '24px 22px', margin: '20px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
              <h2 style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 600, margin: 0 }}>{search.h1} — in stock now</h2>
              <Link href={`/used/${search.slug}`} style={{ fontWeight: 700, color: 'var(--teal)' }}>See all {matches.length} →</Link>
            </div>
            <LocalResultsGrid vehicles={matches.slice(0, 3) as unknown as Vehicle[]} />
          </section>
        ) : (
          <section style={{ background: 'var(--bg-soft)', borderRadius: 18, padding: '22px', margin: '20px 0', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontWeight: 700 }}>{a.category === 'Financing' ? 'Ready to see what you can afford?' : 'Looking for your next vehicle?'}</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {a.category === 'Financing'
                ? <><Link href="/finance" className="btn btn-primary btn-sm">Estimate payments</Link><Link href="/tradein" className="btn btn-ghost btn-sm">Value your trade-in</Link></>
                : <><Link href="/inventory" className="btn btn-primary btn-sm">Browse {vehicles.length} vehicles</Link><Link href="/finder" className="btn btn-ghost btn-sm">AI Finder</Link></>}
            </div>
          </section>
        )}

        {related.length > 0 && (
          <section style={{ margin: '36px 0 70px' }}>
            <h2 style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 600, margin: '0 0 14px' }}>More in {a.category}</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
              {related.map(r => <ArticleCard key={r.slug} a={r} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
