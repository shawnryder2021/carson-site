// SM360 (carsonexports.com) → inventory sync.
// The dealership's current website runs on SM360, whose inventory page loads
// from a public JSON listing API. That feed is the source of truth for stock:
// we fetch it, map each car to our vehicle shape, then build a plan (adds,
// updates, cars to mark sold) that can be previewed before it's applied.

import { stripMakePrefix } from './sheetSync';

export const SM360_LISTING_URL = 'https://www.carsonexports.com/en/used-inventory/api/listing';
const IMG_BASE = 'https://img.sm360.ca/images/inventory';

type Body = 'Sedan' | 'Coupe' | 'SUV' | 'Truck' | 'Wagon';
type Fuel = 'Gas' | 'Hybrid' | 'Electric';
type Drive = 'FWD' | 'RWD' | 'AWD';

export type Sm360Car = {
  sourceId: string;
  vin: string;
  stockNo: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  price: number;
  mileage: number;
  body: Body;
  fuel: Fuel;
  drive: Drive;
  exterior: string;
  interior: string;
  description: string;
  images: string[];
  carfaxUrl: string;
  onHold: boolean;
};

// ───────────────────────── Fetch ─────────────────────────

async function getPage(page: number): Promise<any> {
  const res = await fetch(`${SM360_LISTING_URL}?page=${page}`, {
    cache: 'no-store',
    headers: { Accept: 'application/json', 'User-Agent': 'CarsonExports-InventorySync/1.0' },
  });
  if (!res.ok) throw new Error(`SM360 listing page ${page} failed (HTTP ${res.status})`);
  return res.json();
}

// Page order can shift between requests (we've seen duplicates across pages),
// so dedupe by vehicleId and re-walk the pages until we've seen every item.
export async function fetchSm360Inventory(): Promise<{ cars: Sm360Car[]; expected: number }> {
  const first = await getPage(1);
  const pages = Number(first?.pagination?.numberOfPages) || 1;
  const expected = Number(first?.pagination?.numberOfItems) || 0;
  const byId = new Map<string, any>();
  (first.vehicles || []).forEach((v: any) => byId.set(String(v.vehicleId), v));

  for (let pass = 0; pass < 3 && (!expected || byId.size < expected); pass++) {
    const rest = await Promise.all(Array.from({ length: pages }, (_, i) => getPage(i + 1)));
    rest.forEach(p => (p.vehicles || []).forEach((v: any) => byId.set(String(v.vehicleId), v)));
  }
  return { cars: Array.from(byId.values()).map(mapSm360Vehicle), expected };
}

// ───────────────────────── Mapping ─────────────────────────

const PICKUP = /\b(sierra|silverado|tacoma|tundra|ram|f-?\d{3}|ranger|colorado|canyon|frontier|titan|gladiator|ridgeline|maverick|santa cruz)\b/i;

function toBody(slug: string | undefined, make: string, model: string): Body {
  const s = (slug || '').toLowerCase();
  if (/suv|crossover|minivan|van/.test(s)) return 'SUV';
  if (/pickup|truck/.test(s)) return 'Truck';
  if (/wagon/.test(s)) return 'Wagon';
  if (/coupe|convertible|other/.test(s)) return 'Coupe';
  if (/sedan|hatchback/.test(s)) return 'Sedan';
  // SM360 leaves pickups without a body style.
  return PICKUP.test(`${make} ${model}`) ? 'Truck' : 'SUV';
}

function toFuel(slug: string | undefined): Fuel {
  const s = (slug || '').toLowerCase();
  if (/hybrid|plug/.test(s)) return 'Hybrid';
  if (/electric/.test(s)) return 'Electric';
  return 'Gas'; // includes diesel — our schema has no diesel option
}

function toDrive(v: string | null | undefined): Drive {
  const s = (v || '').toLowerCase();
  if (/all wheel|awd|4x4|4wd|four/.test(s)) return 'AWD';
  if (/front|fwd/.test(s)) return 'FWD';
  // Rear-drive, plus the classics SM360 lists with no drivetrain at all.
  return 'RWD';
}

export function htmlToText(html: string): string {
  return (html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function mapSm360Vehicle(v: any): Sm360Car {
  const make = v.make?.name || '';
  const model = stripMakePrefix(make, v.model?.name || '');
  return {
    sourceId: String(v.vehicleId),
    vin: v.serialNo || '',
    stockNo: v.stockNo || '',
    year: Number(v.year) || 0,
    make,
    model,
    trim: (v.trim?.name || '').trim(),
    price: Math.round(Number(v.salePrice || v.listPrice) || 0),
    mileage: Math.round(Number(v.odometer) || 0),
    body: toBody(v.bodyStyle?.slug, make, model),
    fuel: toFuel(v.fuel?.slug),
    drive: toDrive(v.driveTrain),
    exterior: v.exteriorColor?.colorEn || '',
    interior: v.interiorColor?.colorEn || '',
    description: htmlToText(v.description || ''),
    images: (v.multimedia?.pictures || []).map((p: string) => IMG_BASE + p),
    carfaxUrl: v.carfaxBadges?.VhrReportUrl || '',
    onHold: !!v.onHold,
  };
}

// ───────────────────────── Plan ─────────────────────────

export type ExistingVehicleRow = {
  id: string; year: number; make: string; model: string; price: number; mileage: number;
  body: string; fuel: string; drive: string; exterior: string; interior: string;
  ai_summary: string; images: any[]; status: string;
  source?: string | null; source_id?: string | null; vin?: string | null; stock_no?: string | null;
  trim?: string | null; carfax_url?: string | null; on_hold?: boolean | null;
};

export type FieldChange = { field: string; from: any; to: any };

export type SyncPlan = {
  fetched: number;
  expected: number;
  add: { label: string; row: Record<string, any> }[];
  update: { id: string; label: string; matchedBy: 'source' | 'vin' | 'name'; changes: FieldChange[]; patch: Record<string, any> }[];
  markSold: { id: string; label: string }[];
  unchanged: number;
  hiddenNotInFeed: { id: string; label: string }[];
  blocked?: string;
};

const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const nameKey = (year: number, make: string, model: string) => `${year}|${norm(make)}|${norm(stripMakePrefix(make, model))}`;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const label = (c: { year: number; make: string; model: string }) => `${c.year} ${c.make} ${c.model}`;

// The sheet-era descriptions that are just "year make model" are worth replacing.
const isPlaceholderSummary = (row: ExistingVehicleRow) =>
  (row.ai_summary || '').trim().length < 60;

// Fields shown to people (diffed for the preview) vs. bookkeeping fields.
const VISIBLE_FIELDS = ['year', 'make', 'model', 'trim', 'price', 'mileage', 'body', 'fuel', 'drive', 'exterior', 'interior', 'status', 'on_hold'] as const;

function sameImages(a: string[], b: string[]) {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

export function planSm360Sync(existing: ExistingVehicleRow[], cars: Sm360Car[], expected = cars.length): SyncPlan {
  const plan: SyncPlan = { fetched: cars.length, expected, add: [], update: [], markSold: [], unchanged: 0, hiddenNotInFeed: [] };

  // Guard: a broken or partial feed must never mark the whole lot sold.
  const availableNow = existing.filter(r => r.status === 'available').length;
  if (cars.length < 10 || (availableNow > 0 && cars.length < availableNow * 0.5)) {
    plan.blocked = `Feed returned only ${cars.length} vehicles (site has ${availableNow} available) — refusing to sync.`;
    return plan;
  }

  const bySource = new Map(existing.filter(r => r.source === 'sm360' && r.source_id).map(r => [r.source_id as string, r]));
  const byVin = new Map(existing.filter(r => r.vin).map(r => [(r.vin as string).toUpperCase(), r]));
  const matched = new Set<string>();
  const usedIds = new Set(existing.map(r => r.id));

  for (const car of cars) {
    // 1) exact: already linked to this SM360 vehicle, or same VIN
    let row = bySource.get(car.sourceId);
    let matchedBy: 'source' | 'vin' | 'name' = 'source';
    if (!row && car.vin) { row = byVin.get(car.vin.toUpperCase()); matchedBy = 'vin'; }
    if (row && matched.has(row.id)) row = undefined;

    // 2) first-run fallback: same year/make/model, not yet linked, km within tolerance
    if (!row) {
      const key = nameKey(car.year, car.make, car.model);
      const tolerance = Math.max(5000, car.mileage * 0.1);
      const candidates = existing
        .filter(r => !matched.has(r.id) && !r.source_id && r.status !== 'sold')
        .filter(r => nameKey(r.year, r.make, r.model) === key && Math.abs((r.mileage || 0) - car.mileage) <= tolerance)
        .sort((a, b) => Math.abs((a.mileage || 0) - car.mileage) - Math.abs((b.mileage || 0) - car.mileage));
      row = candidates[0];
      matchedBy = 'name';
    }

    const next = {
      year: car.year, make: car.make, model: car.model, trim: car.trim,
      price: car.price, mileage: car.mileage, body: car.body, fuel: car.fuel, drive: car.drive,
      exterior: car.exterior, interior: car.interior, on_hold: car.onHold,
      source: 'sm360', source_id: car.sourceId, vin: car.vin, stock_no: car.stockNo, carfax_url: car.carfaxUrl || null,
    };

    if (!row) {
      const base = slug(`${car.year} ${car.make} ${car.model} ${car.stockNo || car.sourceId}`);
      let id = base;
      for (let n = 2; usedIds.has(id); n++) id = `${base}-${n}`;
      usedIds.add(id);
      plan.add.push({
        label: `${label(car)} ${car.trim}`.trim(),
        row: { id, ...next, ai_summary: car.description, images: car.images, status: 'available', featured: false },
      });
      continue;
    }

    matched.add(row.id);
    const patch: Record<string, any> = {};
    const changes: FieldChange[] = [];
    const current: Record<string, any> = { ...row, trim: row.trim ?? '', on_hold: !!row.on_hold };
    for (const [k, v] of Object.entries(next)) {
      if ((current[k] ?? null) !== (v ?? null)) {
        patch[k] = v;
        if ((VISIBLE_FIELDS as readonly string[]).includes(k)) changes.push({ field: k, from: current[k], to: v });
      }
    }
    // Back in the feed → back on sale (but leave admin drafts hidden).
    if (row.status === 'sold') { patch.status = 'available'; changes.push({ field: 'status', from: 'sold', to: 'available' }); }

    // Photos: replace with the feed's, but never wipe photos when the feed has none,
    // and keep the non-URL display-options entry stored alongside them.
    const urls = (row.images || []).filter((e: any) => typeof e === 'string');
    const meta = (row.images || []).filter((e: any) => typeof e !== 'string');
    if (car.images.length && !sameImages(urls, car.images)) {
      patch.images = [...car.images, ...meta];
      changes.push({ field: 'photos', from: urls.length, to: car.images.length });
    }
    if (isPlaceholderSummary(row) && car.description) {
      patch.ai_summary = car.description;
      changes.push({ field: 'description', from: (row.ai_summary || '').length + ' chars', to: car.description.length + ' chars' });
    }

    if (Object.keys(patch).length === 0) { plan.unchanged++; continue; }
    plan.update.push({ id: row.id, label: label(car), matchedBy, changes, patch });
  }

  for (const r of existing) {
    if (matched.has(r.id)) continue;
    if (r.status === 'available') plan.markSold.push({ id: r.id, label: label(r) });
    else if (r.status === 'hidden') plan.hiddenNotInFeed.push({ id: r.id, label: label(r) });
  }
  return plan;
}

export const EXISTING_COLUMNS =
  'id, year, make, model, price, mileage, body, fuel, drive, exterior, interior, ai_summary, images, status, source, source_id, vin, stock_no, trim, carfax_url, on_hold';
