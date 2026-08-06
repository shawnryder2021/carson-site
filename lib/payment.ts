// Single source of truth for financing math + the terms shown alongside it.
// Used by the vehicle-page calculator, /finance, and estMonthly() in
// lib/format.ts — so the numbers on a card, in compare, and in the calculator
// can never disagree.

export const DEFAULT_TERMS = { downPct: 0.1, term: 72, apr: 7.2 };
export const TERMS_LABEL = '72mo @ 7.2% APR';
export const TERM_OPTIONS = [36, 48, 60, 72, 84];

export const CREDIT_TIERS = [
  { key: 'excellent', label: 'Excellent', range: '740+', apr: 5.4 },
  { key: 'good', label: 'Good', range: '670-739', apr: 7.2 },
  { key: 'fair', label: 'Fair', range: '580-669', apr: 11.5 },
  { key: 'rebuilding', label: 'Rebuilding', range: '<580', apr: 16.9 },
] as const;

export function aprForTier(key: string): number {
  return CREDIT_TIERS.find(t => t.key === key)?.apr ?? DEFAULT_TERMS.apr;
}

// Amount actually financed after cash down and any trade-in credit.
export function financedAmount(price: number, down = 0, tradeIn = 0): number {
  return Math.max(0, (price || 0) - (down || 0) - (tradeIn || 0));
}

// Standard amortized monthly payment. Handles 0% APR (straight division) and a
// fully-covered price (returns 0) instead of producing NaN/negatives.
export function monthlyPayment(o: {
  price: number;
  down?: number;
  tradeIn?: number;
  term?: number;
  apr?: number;
}): number {
  const term = o.term ?? DEFAULT_TERMS.term;
  const apr = o.apr ?? DEFAULT_TERMS.apr;
  const principal = financedAmount(o.price, o.down, o.tradeIn);
  if (principal <= 0 || term <= 0) return 0;
  const r = apr / 1200;
  if (r <= 0) return Math.round(principal / term);
  return Math.round((principal * r) / (1 - Math.pow(1 + r, -term)));
}
