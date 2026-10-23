// Where every URL from the old carsonexports.com (SM360) lives on this site.
// Single source of truth for both the 301 redirects (app/en/[[...path]]) and
// the link rewriting done when the old news articles were imported, so links
// and redirects can never disagree.
//
// Pure function — callers supply the lookups (vehicle by SM360 id, article by
// SM360 id, which /used make pages exist).

export type LegacyLookups = {
  vehicleIdBySourceId?: (sm360Id: string) => string | undefined;
  articleSlugByLegacyId?: (sm360Id: string) => string | undefined;
  makePages?: Set<string>; // e.g. 'toyota-halifax'
};

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// Old article slugs sometimes end in '-' ("carlotta-thanks-a-million-").
export const cleanArticleSlug = (s: string) => slugify(decodeURIComponent(s));

function makePage(make: string | undefined, l: LegacyLookups): string | undefined {
  if (!make) return undefined;
  const slug = `${slugify(make)}-halifax`;
  return l.makePages?.has(slug) ? `/used/${slug}` : undefined;
}

export function mapLegacyPath(rawPath: string, l: LegacyLookups = {}): string {
  const path = rawPath.split(/[?#]/)[0].replace(/\/+$/, '').toLowerCase();
  const seg = path.split('/').filter(Boolean); // ['en', 'news', 'view', slug, id]
  if (seg.length === 0) return '/';
  if (seg[0] === 'fr') return '/';             // French pages: no French site here yet
  if (seg[0] !== 'en') return path || '/';
  const [, section, a, b, c] = seg;

  switch (section) {
    case undefined: return '/';

    case 'news':
      if (a === 'view' && b) return `/news/${(c && l.articleSlugByLegacyId?.(c)) || cleanArticleSlug(b)}`;
      if (a === 'list' && b === 'reviews') return '/news/category/customer-reviews';
      return '/news';

    case 'used-inventory': {
      // /en/used-inventory/{make}/{model}/{year-make-model}-id{N}
      const id = c?.match(/-id(\d+)$/)?.[1];
      if (id) return (l.vehicleIdBySourceId?.(id) && `/vehicle/${l.vehicleIdBySourceId(id)}`) || makePage(a, l) || '/inventory';
      return makePage(a, l) || '/inventory';
    }
    case 'used-suv-inventory': return makePage(a, l) || '/used/suvs-halifax';
    case 'used-car-inventory': return '/used/sedans-halifax';
    case 'truck-inventory': return '/used/trucks-halifax';
    case 'less-than-25000-inventory': return '/used/cars-under-25000-halifax';

    case 'financing': return '/finance';
    case 'form':
      if (a === 'detailed-financing-request') return '/finance';
      if (a === 'exchange-evaluation-new') return '/tradein';
      if (a === 'price-quote-new') return '/inventory';
      if (a === 'service-appointment') return '/p/service';
      if (a === 'quick-tire-purchase-form') return '/p/tire-centre';
      if (a === 'order-parts') return '/p/parts-accessories';
      return '/contact';

    case 'services':
      if (a === 'tire-centre') return '/p/tire-centre';
      if (a === 'detailing') return '/p/detailing';
      if (a === 'parts') return '/p/parts-accessories';
      return '/p/service';
    case 'special-offers':
      if (a === 'department') return '/p/service-specials';
      if (a === 'trade-in') return '/tradein';
      return '/inventory';

    case 'contact-us': return '/contact';
    case 'about-us': return '/about';
    case 'careers': return '/about';
    case 'our-team': return '/team';
    default: return '/';
  }
}

// Old-site absolute or relative URL → new relative path, or null if it isn't an old-site link.
export function mapLegacyHref(href: string, l: LegacyLookups = {}): string | null {
  const abs = href.match(/^https?:\/\/(?:www\.)?carsonexports\.com(\/.*)?$/i);
  if (abs) return mapLegacyPath(abs[1] || '/', l);
  const rel = href.match(/^(\/(?:en|fr)(?:[/?#].*)?)$/i);
  return rel ? mapLegacyPath(rel[1], l) : null;
}
