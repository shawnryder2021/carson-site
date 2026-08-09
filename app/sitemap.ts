import { MetadataRoute } from 'next';
import { SITE_URL, fetchVehicles, fetchGuides, fetchTeam, fetchPages } from '@/lib/serverDb';

// Regenerate per-request so the daily sheet sync is reflected without a redeploy.
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    '', '/inventory', '/finder', '/tradein', '/finance', '/carfinder', '/financing-explainer',
    '/guides', '/team', '/social', '/about', '/contact', '/faq', '/testimonials',
    '/privacy', '/terms',
  ].map(p => ({
    url: `${SITE_URL}${p}`,
    changeFrequency: p === '' || p === '/inventory' ? 'daily' : 'weekly',
    priority: p === '' ? 1 : p === '/inventory' ? 0.9 : 0.6,
  }));

  const [vehicles, guides, team, pages] = await Promise.all([fetchVehicles(), fetchGuides(), fetchTeam(), fetchPages()]);

  return [
    ...staticRoutes,
    // Sold vehicles stay indexed (long-tail search value + "similar available
    // now" internal links) but are demoted so live inventory ranks first.
    ...vehicles.map(v => ({
      url: `${SITE_URL}/vehicle/${v.id}`,
      changeFrequency: (v.status === 'sold' ? 'monthly' : 'daily') as 'monthly' | 'daily',
      priority: v.status === 'sold' ? 0.4 : 0.8,
    })),
    ...guides.map(g => ({
      url: `${SITE_URL}/guides/${g.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
    ...team.map(m => ({
      url: `${SITE_URL}/team/${m.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.4,
    })),
    ...pages.map(p => ({
      url: `${SITE_URL}/p/${p.slug}`,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
  ];
}
