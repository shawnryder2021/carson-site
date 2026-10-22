import Link from 'next/link';
import type { ServerVehicle } from '@/lib/serverDb';
import { allLocalSearches } from '@/lib/localSearch';
import { jsonLdSafe } from '@/lib/escapeHtml';

// Server-rendered local content at the bottom of the homepage — the copy that
// lets Google match "used cars Dartmouth", "car dealers Dartmouth" etc. Adapted
// from the old carsonexports.com homepage, with live stock numbers and links
// into the /used pages and local guides.

const money = (n: number) => '$' + Math.round(n).toLocaleString('en-CA');

const CATEGORIES: { slug: string; title: string; text: string }[] = [
  { slug: 'trucks-halifax', title: 'Used trucks', text: 'Work-ready half-tons, heavy-duty pickups and 4x4s for towing, job sites and weekends away.' },
  { slug: 'suvs-halifax', title: 'Used SUVs', text: 'Compact, mid-size and three-row SUVs, most with all-wheel drive for Nova Scotia winters.' },
  { slug: 'cars-under-25000-halifax', title: 'Affordable cars', text: 'Efficient sedans and hatchbacks that keep fuel costs and monthly payments low.' },
  { slug: 'hybrid-electric-halifax', title: 'Hybrids & EVs', text: 'Lower running costs and emissions, with the technology to match.' },
  { slug: 'luxury-cars-halifax', title: 'Luxury & performance', text: 'Premium sedans, sporty coupes and upscale SUVs at a more attainable price.' },
  { slug: 'awd-4x4-halifax', title: 'AWD & 4x4', text: 'All-wheel and four-wheel drive for snow, rain and back roads.' },
];

const AREAS: { name: string; href: string }[] = [
  { name: 'Halifax & Dartmouth', href: '/news/used-car-dealership-serving-halifax-dartmouth-hrm' },
  { name: 'Bedford', href: '/news/used-cars-bedford-ns-smart-buyer-s-guide-for-2026' },
  { name: 'Bedford & Sackville', href: '/news/used-cars-bedford-sackville-nova-scotia' },
  { name: 'Cole Harbour', href: '/news/used-cars-cole-harbour-nova-scotia' },
];

export function HomeLocalSection({ vehicles }: { vehicles: ServerVehicle[] }) {
  const searches = allLocalSearches(vehicles);
  const count = (slug: string) => {
    const p = searches.find(s => s.slug === slug);
    return p ? vehicles.filter(p.match).length : 0;
  };
  const priced = vehicles.filter(v => v.price > 0);
  const minPrice = priced.length ? Math.min(...priced.map(v => v.price)) : 0;
  const makes = searches.filter(s => s.kind === 'make').slice(0, 10);

  const faqs = [
    { q: 'Where is Carson Exports located?', a: 'We’re at 550 Windmill Road in Dartmouth, Nova Scotia (B3B 1B3), serving drivers across Halifax Regional Municipality.' },
    { q: 'How many used cars do you have for sale?', a: `We have ${vehicles.length} used cars, trucks and SUVs in stock right now${minPrice ? `, starting at ${money(minPrice)}` : ''}. Inventory is updated daily.` },
    { q: 'Do you offer financing?', a: 'Yes. Our financing team works with traditional lenders and second-chance credit options. You can estimate payments on any vehicle and get pre-qualified online.' },
    { q: 'Can I trade in my current vehicle?', a: 'Yes. Get an instant trade-in estimate online, then bring the vehicle in so we can confirm the offer and apply it to your purchase.' },
    { q: 'Do you service vehicles?', a: 'Yes. Our service department handles maintenance and repairs, and we carry parts, accessories and tires at our Tire & Wheel Centre.' },
  ];
  const faqLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };

  const h2: React.CSSProperties = { fontFamily: 'var(--display)', fontSize: 'clamp(26px, 3.6vw, 36px)', fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 14px' };
  const h3: React.CSSProperties = { fontFamily: 'var(--display)', fontSize: 20, fontWeight: 600, margin: '0 0 8px' };
  const p: React.CSSProperties = { fontSize: 16, lineHeight: 1.7, margin: '0 0 14px', color: 'var(--ink)' };

  return (
    <section style={{ background: 'var(--bg-soft)', padding: '70px 0' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(faqLd) }} />
      <div className="container" style={{ maxWidth: 1100 }}>
        <h2 style={h2}>Used cars, trucks & SUVs in Dartmouth, Nova Scotia</h2>
        <p style={p}>
          Carson Exports is a used car dealership at 550 Windmill Road in Dartmouth, NS. We have <strong>{vehicles.length} pre-owned vehicles</strong> in
          stock today{minPrice ? <>, from {money(minPrice)}</> : null}: rugged used trucks, versatile SUVs, affordable commuter cars, hybrids, EVs and
          luxury models. Every listing shows real photos, the price and the kilometres, and our inventory is updated daily.
        </p>
        <p style={p}>
          Drivers come to us from across Halifax Regional Municipality, including Halifax, Bedford, Sackville and Cole Harbour, for honest pricing,
          financing for every situation, and a team that knows what Nova Scotia roads and winters ask of a vehicle.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, margin: '26px 0 34px' }}>
          {CATEGORIES.map(c => (
            <Link key={c.slug} href={`/used/${c.slug}`} style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, padding: '16px 18px', color: 'var(--ink)', textDecoration: 'none' }}>
              <h3 style={{ ...h3, fontSize: 18, display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                {c.title} <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>{count(c.slug)} in stock</span>
              </h3>
              <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.55 }}>{c.text}</div>
            </Link>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 28, marginBottom: 34 }}>
          <div>
            <h3 style={h3}>Financing for every situation</h3>
            <p style={{ ...p, fontSize: 15 }}>
              From traditional financing to second-chance credit, our financing team helps you get approved and back on the road with a plan that fits
              your budget. <Link href="/finance">Estimate your payments</Link> or <Link href="/tradein">value your trade-in</Link> online.
            </p>
          </div>
          <div>
            <h3 style={h3}>Service, parts & tires</h3>
            <p style={{ ...p, fontSize: 15 }}>
              We’re here after the sale too: our <Link href="/p/service">service department</Link> handles maintenance and repairs, and we carry
              genuine <Link href="/p/parts-accessories">parts & accessories</Link> plus tire packages at our <Link href="/p/tire-centre">Tire & Wheel Centre</Link>.
            </p>
          </div>
          <div>
            <h3 style={h3}>Serving all of HRM</h3>
            <p style={{ ...p, fontSize: 15 }}>
              Local buying guides:{' '}
              {AREAS.map((a, i) => <span key={a.href}>{i > 0 && ' · '}<Link href={a.href}>{a.name}</Link></span>)}.
              {' '}More advice in <Link href="/news">News & Guides</Link>.
            </p>
          </div>
        </div>

        {makes.length > 0 && (
          <div style={{ marginBottom: 34 }}>
            <h3 style={h3}>Shop used cars by make in Dartmouth</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {makes.map(m => <Link key={m.slug} href={`/used/${m.slug}`} className="btn btn-ghost btn-sm">Used {m.one} ({vehicles.filter(m.match).length})</Link>)}
            </div>
          </div>
        )}

        <h3 style={{ ...h3, fontSize: 22 }}>Questions about buying a used car in Dartmouth</h3>
        {faqs.map(f => (
          <details key={f.q} style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 18px', marginBottom: 10 }}>
            <summary style={{ cursor: 'pointer', fontWeight: 600 }}>{f.q}</summary>
            <p style={{ margin: '10px 0 0', lineHeight: 1.6 }}>{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
