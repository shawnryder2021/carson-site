import type { Metadata } from 'next';
import GuideClient from './GuideClient';
import { fetchGuide, SITE_URL } from '@/lib/serverDb';
import { jsonLdSafe } from '@/lib/escapeHtml';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const g = await fetchGuide(params.slug);
  if (!g) return { title: 'Guide not found', robots: { index: false } };
  return {
    title: g.title,
    description: g.excerpt,
    alternates: { canonical: `${SITE_URL}/guides/${g.slug}` },
    openGraph: {
      title: `${g.title} | Carson Exports`,
      description: g.excerpt,
      url: `${SITE_URL}/guides/${g.slug}`,
      type: 'article',
    },
    twitter: { card: 'summary', title: g.title, description: g.excerpt },
  };
}

export default async function GuidePage({ params }: { params: { slug: string } }) {
  const g = await fetchGuide(params.slug);

  const jsonLd = g ? {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: g.title,
    description: g.excerpt,
    articleSection: g.category,
    url: `${SITE_URL}/guides/${g.slug}`,
    publisher: { '@type': 'AutoDealer', name: 'Carson Exports' },
  } : null;

  return (
    <>
      {jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(jsonLd) }} />
      )}
      <GuideClient params={params} />
    </>
  );
}
