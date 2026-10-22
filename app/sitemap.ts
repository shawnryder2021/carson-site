import { MetadataRoute } from 'next';
import { SITE_URL, fetchVehicles, fetchArticles, fetchTeam, fetchPages } from '@/lib/serverDb';
import { NEWS_CATEGORIES, categorySlug } from '@/lib/news';
import { allLocalSearches, MIN_INDEXABLE } from '@/lib/localSearch';

// Regenerate per-request so the daily sheet sync is reflected without a redeploy.
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    '', '/inventory', '/finder', '/tradein', '/finance', '/carfinder', '/financing-explainer',
    '/news', '/team', '/social', '/about', '/contact', '/faq', '/testimonials', '/used',
    '/privacy', '/terms',
  ].map(p => ({
    url: `${SITE_URL}${p}`,
    changeFrequency: p === '' || p === '/inventory' ? 'daily' : 'weekly',
    priority: p === '' ? 1 : p === '/inventory' ? 0.9 : 0.6,
  }));

  const [vehicles, articles, team, pages] = await Promise.all([fetchVehicles(), fetchArticles(), fetchTeam(), fetchPages()]);
  const usedCategories = new Set(articles.map(a => categorySlug(a.category)));

  return [
    ...staticRoutes,
    // Only cars for sale; sold pages still resolve but aren't listed.
    ...vehicles.map(v => ({
      url: `${SITE_URL}/vehicle/${v.id}`,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
    // Local search pages with enough cars to be useful (thin ones are noindex).
    ...allLocalSearches(vehicles)
      .filter(p => vehicles.filter(p.match).length >= MIN_INDEXABLE)
      .map(p => ({ url: `${SITE_URL}/used/${p.slug}`, changeFrequency: 'daily' as const, priority: 0.7 })),
    // News & Guides: categories in use, then every article (lastmod = last edit).
    ...NEWS_CATEGORIES.filter(c => usedCategories.has(c.slug)).map(c => ({
      url: `${SITE_URL}/news/category/${c.slug}`,
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    })),
    ...articles.map(a => ({
      url: `${SITE_URL}/news/${a.slug}`,
      lastModified: a.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
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
