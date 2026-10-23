import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { fetchVehicles, SITE_URL } from '@/lib/serverDb';
import { jsonLdSafe } from '@/lib/escapeHtml';
import { LocalResultsGrid } from '@/components/LocalResultsGrid';
import { allLocalSearches, findLocalSearch, resultsFor, statsFor, introFor, faqFor, MIN_INDEXABLE, AREA } from '@/lib/localSearch';
import type { Vehicle } from '@/data/inventory';

// Inventory changes daily (nightly sync); refresh these pages hourly.
export const revalidate = 3600;

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const vehicles = await fetchVehicles();
  const p = findLocalSearch(params.slug, vehicles);
  if (!p) return { title: 'Page not found', robots: { index: false } };
  const s = statsFor(resultsFor(p, vehicles));
  const description = s.count
    ? `${s.count} used ${s.count === 1 ? p.one : p.many} for sale in ${p.place || `${AREA}, NS`} from $${s.minPrice.toLocaleString('en-CA')}. Real photos, transparent pricing, financing and trade-ins at Carson Exports.`
    : `Looking for used ${p.many} in ${AREA}? Get alerted the moment one arrives at Carson Exports in Dartmouth, NS.`;
  const url = `${SITE_URL}/used/${p.slug}`;
  return {
    title: p.title,
    description,
    alternates: { canonical: url },
    robots: s.count >= MIN_INDEXABLE ? undefined : { index: false, follow: true },
    openGraph: { title: `${p.title} | Carson Exports`, description, url, type: 'website' },
    twitter: { card: 'summary', title: p.title, description },
  };
}

export default async function LocalSearchPage({ params }: { params: { slug: string } }) {
  const vehicles = await fetchVehicles();
  const p = findLocalSearch(params.slug, vehicles);
  if (!p) notFound();

  const results = resultsFor(p, vehicles);
  const stats = statsFor(results);
  const faqs = faqFor(p, stats);
  const url = `${SITE_URL}/used/${p.slug}`;

  // Related searches: other pages with enough cars to be worth a click.
  const related = allLocalSearches(vehicles)
    .filter(o => o.slug !== p.slug)
    .map(o => ({ o, n: vehicles.filter(o.match).length }))
    .filter(x => x.n >= MIN_INDEXABLE)
    // Same make first (its make page and sibling models), then same kind, then most stock.
    .sort((a, b) => Number(!!p.make && b.o.make === p.make) - Number(!!p.make && a.o.make === p.make)
      || Number(b.o.kind === p.kind) - Number(a.o.kind === p.kind) || b.n - a.n)
    .slice(0, 12);

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
        { '@type': 'ListItem', position: 2, name: 'Used cars', item: `${SITE_URL}/used` },
        { '@type': 'ListItem', position: 3, name: p.h1, item: url },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: p.h1,
      numberOfItems: results.length,
      itemListElement: results.slice(0, 50).map((v, i) => ({
        '@type': 'ListItem', position: i + 1, url: `${SITE_URL}/vehicle/${v.id}`, name: `${v.year} ${v.make} ${v.model}`,
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    },
  ];

  return (
    <div className="page fade-in">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(jsonLd) }} />

      <div style={{ background: 'var(--bg-soft)', padding: '40px 0' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <nav style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 14 }}>
            <Link href="/" style={{ color: 'var(--muted)' }}>Home</Link> ›{' '}
            <Link href="/used" style={{ color: 'var(--muted)' }}>Used cars</Link> ›{' '}
            <span>{p.noun}</span>
          </nav>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 12px' }}>{p.h1}</h1>
          <p style={{ fontSize: 16, color: 'var(--ink)', lineHeight: 1.65, margin: 0, maxWidth: 820 }}>{introFor(p, stats)}</p>
          {stats.count > 0 && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
              <Link href="/finance" className="btn btn-ghost btn-sm">Estimate payments</Link>
              <Link href="/tradein" className="btn btn-ghost btn-sm">Value your trade-in</Link>
              <Link href="/inventory" className="btn btn-ghost btn-sm">See all inventory</Link>
            </div>
          )}
        </div>
      </div>

      <div className="container" style={{ maxWidth: 1200, padding: '32px 20px 20px' }}>
        {results.length > 0 ? (
          <LocalResultsGrid vehicles={results as unknown as Vehicle[]} />
        ) : (
          <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 16, padding: 32, textAlign: 'center' }}>
            <p style={{ fontSize: 16, margin: '0 0 16px' }}>Nothing in stock that matches right now.</p>
            <Link href="/carfinder" className="btn btn-primary">Get alerted when one arrives</Link>
          </div>
        )}
      </div>

      <div className="container" style={{ maxWidth: 900, padding: '28px 20px 20px' }}>
        <h2 style={{ fontFamily: 'var(--display)', fontSize: 24, fontWeight: 600, margin: '0 0 14px' }}>Questions about used {p.many} in {AREA}</h2>
        {faqs.map(f => (
          <details key={f.q} style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 18px', marginBottom: 10 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{f.q}</summary>
            <p style={{ margin: '10px 0 0', color: 'var(--ink)', lineHeight: 1.6 }}>{f.a}</p>
          </details>
        ))}
      </div>

      {related.length > 0 && (
        <div className="container" style={{ maxWidth: 1200, padding: '20px 20px 70px' }}>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 600, margin: '0 0 12px' }}>More used cars in {AREA}</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {related.map(({ o, n }) => (
              <Link key={o.slug} href={`/used/${o.slug}`} className="btn btn-ghost btn-sm">{o.noun} ({n})</Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
