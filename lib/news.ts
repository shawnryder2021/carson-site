// News & Guides categories: display name ⇄ URL slug (/news/category/[slug]).
export const NEWS_CATEGORIES = [
  { name: 'Buying Guides', slug: 'buying-guides', blurb: 'How to pick the right used vehicle for Nova Scotia life, from budget to body style.' },
  { name: 'Comparisons & Trims', slug: 'comparisons-trims', blurb: 'Head-to-head comparisons and plain-English trim breakdowns for popular models.' },
  { name: 'Financing', slug: 'financing', blurb: 'Car loans, credit and budgeting for a used vehicle in Nova Scotia.' },
  { name: 'Ownership & Care', slug: 'ownership-care', blurb: 'Tires, maintenance, warranties and keeping your vehicle’s value.' },
  { name: 'Nova Scotia Living', slug: 'nova-scotia-living', blurb: 'Driving in HRM and around the province, licensing, road trips and our community.' },
  { name: 'Customer Reviews', slug: 'customer-reviews', blurb: 'What customers say about buying from Carson Exports.' },
] as const;

export const categorySlug = (name: string) => NEWS_CATEGORIES.find(c => c.name === name)?.slug || 'buying-guides';
export const categoryBySlug = (slug: string) => NEWS_CATEGORIES.find(c => c.slug === slug);

export const fmtArticleDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'America/Halifax' }) : '';
