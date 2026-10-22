import type { Metadata } from 'next';
import Link from 'next/link';
import { fetchVehicles, SITE_URL } from '@/lib/serverDb';
import { allLocalSearches, LocalSearch, AREA } from '@/lib/localSearch';
import { PageHeader } from '@/components/PageHeader';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Used Cars for Sale in ${AREA}, NS`,
  description: `Browse used SUVs, trucks, sedans, AWD and luxury cars for sale in ${AREA}, NS — by type, price, feature or make. Updated daily at Carson Exports.`,
  alternates: { canonical: `${SITE_URL}/used` },
};

const GROUPS: { kind: LocalSearch['kind']; title: string }[] = [
  { kind: 'body', title: 'By type' },
  { kind: 'price', title: 'By price' },
  { kind: 'feature', title: 'By feature' },
  { kind: 'make', title: 'By make' },
];

export default async function UsedIndex() {
  const vehicles = await fetchVehicles();
  const pages = allLocalSearches(vehicles).map(p => ({ p, n: vehicles.filter(p.match).length })).filter(x => x.n > 0);

  return (
    <div className="page fade-in">
      <PageHeader eyebrow="Shop used" title={`Used cars in ${AREA}`} subtitle={`${vehicles.length} vehicles for sale at our Dartmouth lot, updated daily. Pick a category to get started.`} />
      <div className="container" style={{ maxWidth: 1100, padding: '10px 20px 80px' }}>
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
