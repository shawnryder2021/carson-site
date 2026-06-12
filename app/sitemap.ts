import { MetadataRoute } from 'next';
import { SITE_URL, fetchVehicles, fetchGuides, fetchTeam } from '@/lib/serverDb';

// Regenerate per-request so the daily sheet sync is reflected without a redeploy.
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    '', '/inventory', '/finder', '/tradein', '/finance', '/carfinder', '/inventory-search', '/financing-explainer',
    '/guides', '/team', '/social', '/about', '/contact', '/faq', '/testimonials',
  ].map(p => ({
    url: `${SITE_URL}${p}`,
    changeFrequency: p === '' || p === '/inventory' ? 'daily' : 'weekly',
    priority: p === '' ? 1 : p === '/inventory' ? 0.9 : 0.6,
  }));

  const [vehicles, guides, team] = await Promise.all([fetchVehicles(), fetchGuides(), fetchTeam()]);

  return [
    ...staticRoutes,
    ...vehicles.map(v => ({
      url: `${SITE_URL}/vehicle/${v.id}`,
      changeFrequency: 'daily' as const,
      priority: 0.8,
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
  ];
}
