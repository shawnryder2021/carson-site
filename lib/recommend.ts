// Derive a pseudo CarFinder request from a set of "signal" vehicles (cars a
// shopper saved/viewed, or a single sold car they landed on) and reuse the
// CarFinder matcher to find similar AVAILABLE inventory. matchesRequest already
// excludes sold/hidden vehicles, so recommendations are always buyable.
import { matchesRequest, CarRequest } from './carMatch';
import type { AdminVehicle } from './db';

export function buildRecommendations(
  signals: AdminVehicle[],
  inventory: AdminVehicle[],
  exclude: Set<string>,
  limit = 4,
): AdminVehicle[] {
  if (signals.length === 0) return [];

  const freq = (vals: string[]) => {
    const counts = new Map<string, number>();
    vals.forEach(v => v && counts.set(v, (counts.get(v) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  };
  const topBody = freq(signals.map(s => s.body))[0];
  const topMake = freq(signals.map(s => s.make))[0];
  const prices = signals.map(s => s.price).filter(n => n > 0);
  if (prices.length === 0) return [];
  const priceMax = Math.round(Math.max(...prices) * 1.2);
  const priceFloor = Math.round(Math.min(...prices) * 0.7);
  const median = [...prices].sort((a, b) => a - b)[Math.floor(prices.length / 2)];

  const pseudo: CarRequest = {
    name: '', email: '', phone: '', contactPref: 'email',
    body: topBody ? topBody[0] : '',
    make: topMake && topMake[1] >= 2 ? topMake[0] : '',
    model: '', yearMin: null, priceMax, mileageMax: null,
    fuel: '', drive: '', notes: '', active: true, notifiedVehicleIds: [],
  };

  return inventory
    .filter(v => !exclude.has(v.id) && v.price >= priceFloor && matchesRequest(v as any, pseudo))
    .sort((a, b) => Math.abs(a.price - median) - Math.abs(b.price - median))
    .slice(0, limit);
}

// Same idea, but seeded from ONE vehicle (a sold car). Widens the net a little
// since a single signal gives a narrow price band, and always keys off the make
// so "similar to this Civic" stays recognisable.
export function similarToVehicle(vehicle: AdminVehicle, inventory: AdminVehicle[], limit = 4): AdminVehicle[] {
  const pseudo: CarRequest = {
    name: '', email: '', phone: '', contactPref: 'email',
    body: vehicle.body || '',
    make: '', model: '', yearMin: null,
    priceMax: Math.round(vehicle.price * 1.25),
    mileageMax: null, fuel: '', drive: '', notes: '', active: true, notifiedVehicleIds: [],
  };
  const floor = Math.round(vehicle.price * 0.7);
  const sameMakeFirst = (a: AdminVehicle, b: AdminVehicle) => {
    const am = a.make === vehicle.make ? 0 : 1;
    const bm = b.make === vehicle.make ? 0 : 1;
    if (am !== bm) return am - bm;
    return Math.abs(a.price - vehicle.price) - Math.abs(b.price - vehicle.price);
  };
  return inventory
    .filter(v => v.id !== vehicle.id && v.price >= floor && matchesRequest(v as any, pseudo))
    .sort(sameMakeFirst)
    .slice(0, limit);
}
