import type { Metadata } from 'next';
import Link from 'next/link';
import { fetchVehicles, SITE_URL } from '@/lib/serverDb';
import { allLocalSearches, LocalSearch, AREA } from '@/lib/localSearch';
import { PageHeader } from '@/components/PageHeader';

export const revalidate = 3600;

// Targets "used cars nova scotia" (1,300/mo); the category pages under it target Halifax & Dartmouth.
export async function generateMetadata(): Promise<Metadata> {
  const vehicles = await fetchVehicles();
  const description = `${vehicles.length} used cars, trucks and SUVs for sale in Nova Scotia at Carson Exports in Dartmouth. Browse by type, price, feature or make. Updated daily.`;
  return {
    title: 'Used Cars for Sale in Nova Scotia',
    description,
    alternates: { canonical: `${SITE_URL}/used` },
    openGraph: { title: 'Used Cars for Sale in Nova Scotia | Carson Exports', description, url: `${SITE_URL}/used` },
  };
}

const GROUPS: { kind: LocalSearch['kind']; title: string }[] = [
  { kind: 'body', title: 'By type' },
  { kind: 'price', title: 'By price' },
  { kind: 'feature', title: 'By feature' },
  { kind: 'make', title: 'By make' },
  { kind: 'model', title: 'By model' },
];

export default async function UsedIndex() {
  const vehicles = await fetchVehicles();
  const pages = allLocalSearches(vehicles).map(p => ({ p, n: vehicles.filter(p.match).length })).filter(x => x.n > 0);

  return (
    <div className="page fade-in">
      <PageHeader eyebrow="Shop used" title="Used cars for sale in Nova Scotia" subtitle={`${vehicles.length} used cars, trucks and SUVs at our Dartmouth lot, serving ${AREA} and the rest of the province. Updated daily.`} />
      <div className="container" style={{ maxWidth: 1100, padding: '10px 20px 80px' }}>
        <p style={{ fontSize: 16, lineHeight: 1.7, maxWidth: 820, margin: '0 auto 30px', textAlign: 'center' }}>
          Carson Exports sells used vehicles from 550 Windmill Road in Dartmouth, with buyers coming from across Nova Scotia.
          Every listing is a car in stock now, with real photos, the price and the kilometres. Start with a body style, a price
          range or a make, or <Link href="/inventory">browse all {vehicles.length} vehicles</Link>. Not sure what fits?
          The <Link href="/finder">AI Car Finder</Link> matches you in six questions, and our <Link href="/news">buying guides</Link> cover
          financing, winter driving and more.
        </p>
        {GROUPS.map(g => {
          const items = pages.filter(x => x.p.kind === g.kind);
          if (!items.length) return null;
          return (
            <section key={g.kind} style={{ marginBottom: 32 }}>
              <h2 style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 600, margin: '0 0 12px' }}>{g.title}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                {items.map(({ p, n }) => (
                  <Link key={p.slug} href={`/used/${p.slug}`} style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, padding: '16px 18px', color: 'var(--ink)', textDecoration: 'none' }}>
                    <div style={{ fontWeight: 700 }}>Used {p.noun}</div>
                    <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{n} in stock</div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
