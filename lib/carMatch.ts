// Shared CarFinder matching logic — used by the admin page (browser)
// and the alert API route (server). Keep free of Supabase imports.

export type CarRequest = {
  id?: string;
  name: string;
  email: string;
  phone: string;
  contactPref: 'email' | 'sms';
  body: string;       // '' = any
  make: string;
  model: string;
  yearMin?: number | null;
  priceMax?: number | null;
  mileageMax?: number | null;
  fuel: string;
  drive: string;
  notes: string;
  active: boolean;
  notifiedVehicleIds: string[];
  createdAt?: string;
};

type MatchableVehicle = {
  id: string; year: number; make: string; model: string;
  price: number; mileage: number; body: string; fuel: string; drive: string;
  status?: string;
};

const norm = (s: string) => (s || '').trim().toLowerCase();

export function matchesRequest(v: MatchableVehicle, r: CarRequest): boolean {
  if (v.status === 'sold' || v.status === 'hidden') return false;
  if (r.body && norm(v.body) !== norm(r.body)) return false;
  if (r.make && !norm(v.make).includes(norm(r.make))) return false;
  if (r.model && !norm(v.model).includes(norm(r.model))) return false;
  if (r.yearMin && v.year < r.yearMin) return false;
  if (r.priceMax && v.price > r.priceMax) return false;
  if (r.mileageMax && v.mileage > r.mileageMax) return false;
  if (r.fuel && norm(v.fuel) !== norm(r.fuel)) return false;
  if (r.drive && norm(v.drive) !== norm(r.drive)) return false;
  return true;
}

// New matches = matching vehicles this person hasn't been alerted about yet.
export function newMatchesFor(vehicles: MatchableVehicle[], r: CarRequest): MatchableVehicle[] {
  const seen = new Set(r.notifiedVehicleIds || []);
  return vehicles.filter(v => !seen.has(v.id) && matchesRequest(v, r));
}

export function describeRequest(r: CarRequest): string {
  const parts: string[] = [];
  if (r.yearMin) parts.push(`${r.yearMin}+`);
  if (r.make) parts.push(r.make);
  if (r.model) parts.push(r.model);
  if (r.body) parts.push(r.body);
  if (r.fuel) parts.push(r.fuel);
  if (r.drive) parts.push(r.drive);
  if (r.priceMax) parts.push(`under $${r.priceMax.toLocaleString()}`);
  if (r.mileageMax) parts.push(`< ${r.mileageMax.toLocaleString()} km`);
  return parts.length ? parts.join(' · ') : 'Any vehicle';
}
