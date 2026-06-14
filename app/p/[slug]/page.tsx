import type { Metadata } from 'next';
import PageClient from './PageClient';
import { fetchPage, SITE_URL } from '@/lib/serverDb';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const p = await fetchPage(params.slug);
  if (!p) return { title: 'Page not found', robots: { index: false } };
  return {
    title: p.title,
    description: p.description,
    alternates: { canonical: `${SITE_URL}/p/${p.slug}` },
    openGraph: { title: `${p.title} | Carson Exports`, description: p.description, url: `${SITE_URL}/p/${p.slug}`, type: 'website' },
  };
}

export default function Page({ params }: { params: { slug: string } }) {
  return <PageClient params={params} />;
}
