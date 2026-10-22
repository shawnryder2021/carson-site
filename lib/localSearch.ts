// Local search landing pages: /used/[slug], e.g. /used/suvs-halifax.
// Each page is a live slice of inventory (body style, price band, feature or
// make) with copy built from the real numbers, so every page says something
// specific. Pages with fewer than MIN_INDEXABLE cars render but are noindex
// and left out of the sitemap — no thin pages for Google.

import type { ServerVehicle } from './serverDb';

export const AREA = 'Halifax & Dartmouth';
export const MIN_INDEXABLE = 3;

type Kind = 'body' | 'price' | 'feature' | 'make';

export type LocalSearch = {
  slug: string;
  kind: Kind;
  noun: string;        // heading form: "SUVs", "Cars Under $25,000", "Toyota Vehicles"
  many: string;        // in a sentence: "SUVs", "cars under $25,000", "Toyota vehicles"
  one: string;         // singular: "SUV", "car under $25,000", "Toyota"
  make?: string;
  place?: string;       // place named in the meta description (default AREA)
  h1: string;
  title: string;
  blurb: string;       // one line on why shoppers search this
  match: (v: ServerVehicle) => boolean;
  sort?: (a: ServerVehicle, b: ServerVehicle) => number;
};

const LUXURY = new Set(['acura', 'audi', 'bentley', 'bmw', 'cadillac', 'ferrari', 'genesis', 'infiniti', 'jaguar', 'land rover', 'lexus', 'lincoln', 'maserati', 'mclaren', 'mercedes-benz', 'porsche', 'tesla', 'volvo']);
const byPrice = (a: ServerVehicle, b: ServerVehicle) => a.price - b.price;

// Classic & collector: 20+ years old, or an exotic/collector make.
const EXOTIC = new Set(['aston martin', 'bentley', 'ferrari', 'lamborghini', 'lotus', 'maserati', 'mclaren', 'rolls-royce']);
const isClassicOrCollector = (v: ServerVehicle) => v.year <= new Date().getFullYear() - 20 || EXOTIC.has(v.make.toLowerCase());

const page = (slug: string, kind: Kind, noun: string, one: string, blurb: string, match: LocalSearch['match'], sort?: LocalSearch['sort'], many = noun.toLowerCase()): LocalSearch => ({
  slug, kind, noun, one, many, blurb, match, sort,
  h1: `Used ${noun} in ${AREA}`,
  title: `Used ${noun} for Sale in ${AREA}, NS`,
});

const STATIC_PAGES: LocalSearch[] = [
  page('suvs-halifax', 'body', 'SUVs', 'SUV', 'Room for the family and the gear, with plenty of AWD options for Nova Scotia winters.', v => v.body === 'SUV', undefined, 'SUVs'),
  page('trucks-halifax', 'body', 'Trucks', 'truck', 'Pickups for work, towing and weekends away, most with 4x4.', v => v.body === 'Truck'),
  page('sedans-halifax', 'body', 'Sedans', 'sedan', 'Efficient, comfortable daily drivers for commuting around HRM.', v => v.body === 'Sedan'),
  page('sports-cars-halifax', 'body', 'Sports Cars & Coupes', 'sports car', 'Performance and collector cars, from modern coupes to classics.', v => v.body === 'Coupe'),
  page('cars-under-20000-halifax', 'price', 'Cars Under $20,000', 'car under $20,000', 'Affordable used cars for a first car or a tight budget.', v => v.price > 0 && v.price < 20000, byPrice),
  page('cars-under-25000-halifax', 'price', 'Cars Under $25,000', 'car under $25,000', 'Well-priced used cars and SUVs that keep monthly payments low.', v => v.price > 0 && v.price < 25000, byPrice),
  page('cars-under-30000-halifax', 'price', 'Cars Under $30,000', 'car under $30,000', 'Newer, lower-kilometre vehicles at a sensible price.', v => v.price > 0 && v.price < 30000, byPrice),
  page('cars-under-40000-halifax', 'price', 'Cars Under $40,000', 'car under $40,000', 'Late-model SUVs, trucks and premium cars without new-car pricing.', v => v.price > 0 && v.price < 40000, byPrice),
  page('awd-4x4-halifax', 'feature', 'AWD & 4x4 Vehicles', 'AWD or 4x4 vehicle', 'All-wheel and four-wheel drive for snow, rain and back roads.', v => v.drive === 'AWD', undefined, 'AWD & 4x4 vehicles'),
  page('hybrid-electric-halifax', 'feature', 'Hybrid & Electric Cars', 'hybrid or electric car', 'Spend less at the pump, or skip it entirely.', v => v.fuel === 'Hybrid' || v.fuel === 'Electric'),
  page('low-km-halifax', 'feature', 'Low-Kilometre Cars', 'low-kilometre car', 'Vehicles with under 30,000 km, close to new for less.', v => v.mileage > 0 && v.mileage < 30000, (a, b) => a.mileage - b.mileage),
  // Targets "classic cars for sale nova scotia" (880/mo), "antique cars for sale in nova scotia" (590).
  {
    ...page('classic-cars-nova-scotia', 'feature', 'Classic & Collector Cars', 'classic or collector car',
      'Vintage classics, antique and collector cars, and modern exotics.',
      isClassicOrCollector, (a, b) => a.year - b.year, 'classic & collector cars'),
    h1: 'Classic & Collector Cars for Sale in Nova Scotia',
    title: 'Classic Cars for Sale in Nova Scotia',
    place: 'Nova Scotia',
  },
  page('luxury-cars-halifax', 'feature', 'Luxury Cars', 'luxury car', 'Premium and performance brands, priced to market.', v => LUXURY.has(v.make.toLowerCase())),
];

const makeSlug = (make: string) => `${make.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-halifax`;

// Make pages exist for every make with at least 2 cars for sale right now.
function makePages(vehicles: ServerVehicle[]): LocalSearch[] {
  const counts = new Map<string, number>();
  vehicles.forEach(v => counts.set(v.make, (counts.get(v.make) || 0) + 1));
  return Array.from(counts.entries())
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([make]) => ({
      ...page(makeSlug(make), 'make', `${make} Vehicles`, make, `Every used ${make} we have in stock, updated daily.`, v => v.make === make, undefined, `${make} vehicles`),
      make,
    }));
}

export function allLocalSearches(vehicles: ServerVehicle[]): LocalSearch[] {
  return [...STATIC_PAGES, ...makePages(vehicles)];
}

export function findLocalSearch(slug: string, vehicles: ServerVehicle[]): LocalSearch | undefined {
  return allLocalSearches(vehicles).find(p => p.slug === slug);
}

const hasPhoto = (v: ServerVehicle) => (v.images || []).some(i => typeof i === 'string');

export function resultsFor(p: LocalSearch, vehicles: ServerVehicle[]): ServerVehicle[] {
  const list = vehicles.filter(p.match);
  if (p.sort) list.sort(p.sort);
  // Cars with photos first, original order kept within each group.
  return [...list.filter(hasPhoto), ...list.filter(v => !hasPhoto(v))];
}

const money = (n: number) => '$' + Math.round(n).toLocaleString('en-CA');
const km = (n: number) => Math.round(n).toLocaleString('en-CA') + ' km';

export type LocalStats = { count: number; minPrice: number; maxPrice: number; avgKm: number; topModels: string[]; cheapest?: ServerVehicle; newestYear?: number };

export function statsFor(results: ServerVehicle[]): LocalStats {
  const priced = results.filter(v => v.price > 0);
  const models = new Map<string, number>();
  results.forEach(v => models.set(`${v.make} ${v.model}`, (models.get(`${v.make} ${v.model}`) || 0) + 1));
  return {
    count: results.length,
    minPrice: priced.length ? Math.min(...priced.map(v => v.price)) : 0,
    maxPrice: priced.length ? Math.max(...priced.map(v => v.price)) : 0,
    avgKm: results.length ? results.reduce((s, v) => s + (v.mileage || 0), 0) / results.length : 0,
    topModels: Array.from(models.entries()).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([m]) => m),
    cheapest: priced.slice().sort(byPrice)[0],
    newestYear: results.length ? Math.max(...results.map(v => v.year)) : undefined,
  };
}

// Intro paragraph built from live inventory.
export function introFor(p: LocalSearch, s: LocalStats): string {
  if (s.count === 0) {
    return `We don’t have any used ${p.many} in stock right now. Inventory changes daily — set up a free CarFinder alert below and we’ll let you know the moment one arrives at our Dartmouth lot.`;
  }
  const range = s.minPrice === s.maxPrice ? `at ${money(s.minPrice)}` : `from ${money(s.minPrice)} to ${money(s.maxPrice)}`;
  const popular = p.make
    ? (s.topModels.length ? ` Models in stock include the ${s.topModels.map(m => m.slice(p.make!.length + 1)).join(', ')}.` : '')
    : s.topModels.length > 1 ? ` Popular picks right now include the ${s.topModels.slice(0, 3).join(', ')}.` : '';
  return `Carson Exports has ${s.count} used ${s.count === 1 ? p.one : p.many} for sale at our lot on Windmill Road in Dartmouth, priced ${range} with an average of ${km(s.avgKm)}. ${p.blurb}${popular} Every listing shows real photos, the price and the kilometres, and the list is updated daily.`;
}

export function faqFor(p: LocalSearch, s: LocalStats): { q: string; a: string }[] {
  const noun = p.many;
  const faqs: { q: string; a: string }[] = [
    {
      q: `How many used ${noun} do you have in ${AREA}?`,
      a: s.count
        ? `We currently have ${s.count} used ${noun} in stock at 550 Windmill Road in Dartmouth, priced ${s.minPrice === s.maxPrice ? `at ${money(s.minPrice)}` : `from ${money(s.minPrice)} to ${money(s.maxPrice)}`}. Our inventory is updated daily.`
        : `None right now — inventory changes daily. Set up a free CarFinder alert and we’ll contact you when one arrives.`,
    },
  ];
  if (s.cheapest) {
    faqs.push({
      q: `What is the most affordable used ${p.one} you have?`,
      a: `Right now it’s the ${s.cheapest.year} ${s.cheapest.make} ${s.cheapest.model} at ${money(s.cheapest.price)} with ${km(s.cheapest.mileage)}.`,
    });
  }
  faqs.push(
    { q: 'Do you offer financing?', a: 'Yes. Every listing shows an estimated monthly payment, and you can get pre-qualified online on our Financing page.' },
    { q: 'Can I trade in my current vehicle?', a: 'Yes. Get an instant trade-in estimate online, then bring the vehicle in so we can confirm the offer.' },
    { q: 'Where is Carson Exports located?', a: 'We’re at 550 Windmill Road in Dartmouth, Nova Scotia, a short drive from Halifax, Bedford and Sackville.' },
  );
  return faqs;
}
