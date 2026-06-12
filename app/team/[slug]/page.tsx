import type { Metadata } from 'next';
import TeamClient from './TeamClient';
import { fetchTeamMember, SITE_URL } from '@/lib/serverDb';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const m = await fetchTeamMember(params.slug);
  if (!m) return { title: 'Team member', robots: { index: false } };
  const title = `${m.name} — ${m.role}`;
  const description = m.bio
    ? m.bio.slice(0, 155)
    : `Meet ${m.name}, ${m.role} at Carson Exports in Dartmouth, NS.`;
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/team/${m.slug}` },
    openGraph: {
      title: `${title} | Carson Exports`,
      description,
      url: `${SITE_URL}/team/${m.slug}`,
      type: 'profile',
      images: m.photoUrl ? [{ url: m.photoUrl }] : undefined,
    },
    twitter: { card: 'summary', title, description },
  };
}

export default async function TeamMemberPage({ params }: { params: { slug: string } }) {
  const m = await fetchTeamMember(params.slug);

  const jsonLd = m ? {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: m.name,
    jobTitle: m.role,
    image: m.photoUrl || undefined,
    url: `${SITE_URL}/team/${m.slug}`,
    worksFor: {
      '@type': 'AutoDealer',
      name: 'Carson Exports',
      address: { '@type': 'PostalAddress', streetAddress: '550 Windmill Rd', addressLocality: 'Dartmouth', addressRegion: 'NS', postalCode: 'B3B 1B3', addressCountry: 'CA' },
    },
  } : null;

  return (
    <>
      {jsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      )}
      <TeamClient params={params} />
    </>
  );
}
