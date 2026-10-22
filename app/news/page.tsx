import type { Metadata } from 'next';
import Link from 'next/link';
import { fetchArticles, SITE_URL } from '@/lib/serverDb';
import { NEWS_CATEGORIES, categorySlug } from '@/lib/news';
import { ArticleCard } from '@/components/ArticleCard';
import { PageHeader } from '@/components/PageHeader';

export const revalidate = 3600;
const PER_PAGE = 24;

export async function generateMetadata({ searchParams }: { searchParams: { page?: string } }): Promise<Metadata> {
  const page = Math.max(1, parseInt(searchParams.page || '1', 10) || 1);
  const url = page > 1 ? `${SITE_URL}/news?page=${page}` : `${SITE_URL}/news`;
  const title = page > 1 ? `News & Buying Guides — Page ${page}` : 'News & Buying Guides for Used Car Buyers in Nova Scotia';
  const description = 'Used car buying guides, model comparisons, financing tips and Nova Scotia driving advice from Carson Exports in Dartmouth.';
  return { title, description, alternates: { canonical: url }, openGraph: { title: `${title} | Carson Exports`, description, url, type: 'website' } };
}

export default async function NewsIndex({ searchParams }: { searchParams: { page?: string } }) {
  const all = await fetchArticles();
  const pages = Math.max(1, Math.ceil(all.length / PER_PAGE));
  const page = Math.min(pages, Math.max(1, parseInt(searchParams.page || '1', 10) || 1));
  const items = all.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const [featured, ...rest] = page === 1 ? items : [undefined, ...items];
  const counts = new Map<string, number>();
  all.forEach(a => counts.set(a.category, (counts.get(a.category) || 0) + 1));

  return (
    <div className="page fade-in">
      <PageHeader eyebrow="News & Guides" title="Buying guides & local advice" subtitle="Straight answers on choosing, financing and owning a used vehicle in Nova Scotia." />
      <div className="container" style={{ maxWidth: 1200, padding: '0 20px 80px' }}>
        <nav aria-label="Categories" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 28 }}>
          {NEWS_CATEGORIES.filter(c => counts.get(c.name)).map(c => (
            <Link key={c.slug} href={`/news/category/${c.slug}`} className="btn btn-ghost btn-sm">{c.name} ({counts.get(c.name)})</Link>
          ))}
        </nav>

        {all.length === 0 && <p style={{ textAlign: 'center', color: 'var(--muted)' }}>No articles yet.</p>}
        {featured && <div style={{ marginBottom: 24 }}><ArticleCard a={featured} large /></div>}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {rest.filter(Boolean).map(a => <ArticleCard key={a!.slug} a={a!} />)}
        </div>

        {pages > 1 && (
          <nav aria-label="Pages" style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 36, flexWrap: 'wrap' }}>
            {Array.from({ length: pages }, (_, i) => i + 1).map(n => (
              <Link key={n} href={n === 1 ? '/news' : `/news?page=${n}`} className={`btn btn-sm ${n === page ? 'btn-dark' : 'btn-ghost'}`} aria-current={n === page ? 'page' : undefined}>{n}</Link>
            ))}
          </nav>
        )}
        <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--muted)', marginTop: 24 }}>
          Browse by topic: {NEWS_CATEGORIES.map((c, i) => <span key={c.slug}>{i > 0 && ' · '}<Link href={`/news/category/${categorySlug(c.name)}`} style={{ color: 'var(--muted)' }}>{c.name}</Link></span>)}
        </p>
      </div>
    </div>
  );
}
