import type { Metadata } from 'next';
import PageClient from './PageClient';
import { fetchPageFull, SITE_URL } from '@/lib/serverDb';
import { jsonLdSafe } from '@/lib/escapeHtml';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const p = await fetchPageFull(params.slug);
  if (!p) return { title: 'Page not found', robots: { index: false } };
  const url = `${SITE_URL}/p/${p.slug}`;
  const images = p.ogImage ? [{ url: p.ogImage, width: 1200, height: 630 }] : [];
  return {
    title: p.title,
    description: p.description,
    alternates: { canonical: url },
    openGraph: {
      title: `${p.title} | Carson Exports`,
      description: p.description,
      url,
      type: 'website',
      ...(images.length ? { images } : {}),
    },
    twitter: {
      card: p.ogImage ? 'summary_large_image' : 'summary',
      title: `${p.title} | Carson Exports`,
      description: p.description,
      ...(p.ogImage ? { images: [p.ogImage] } : {}),
    },
  };
}

function buildJsonLd(p: { title: string; description: string; slug: string; blocks: any[] }) {
  const schemas: object[] = [];

  schemas.push({
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: p.title,
    description: p.description,
    url: `${SITE_URL}/p/${p.slug}`,
    isPartOf: { '@type': 'WebSite', name: 'Carson Exports', url: SITE_URL },
    publisher: {
      '@type': 'AutoDealer',
      name: 'Carson Exports',
      url: SITE_URL,
      address: { '@type': 'PostalAddress', streetAddress: '550 Windmill Rd', addressLocality: 'Dartmouth', addressRegion: 'NS', postalCode: 'B3B 1B3', addressCountry: 'CA' },
    },
  });

  const faqBlocks = p.blocks.filter((b: any) => b.type === 'faq' && b.items?.length);
  if (faqBlocks.length) {
    const allItems = faqBlocks.flatMap((b: any) => b.items);
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: allItems.filter((item: any) => item.q && item.a).map((item: any) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    });
  }

  return schemas;
}

export default async function Page({ params }: { params: { slug: string } }) {
  const p = await fetchPageFull(params.slug);
  const jsonLd = p ? buildJsonLd(p) : [];

  return (
    <>
      {jsonLd.map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(schema) }} />
      ))}
      <PageClient params={params} />
    </>
  );
}
