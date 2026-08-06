import { monthlyPayment, DEFAULT_TERMS } from './payment';

export function fmtPrice(n: number): string {
  return '$' + n.toLocaleString();
}

export function fmtMiles(n: number): string {
  return n.toLocaleString() + ' km';
}

// Estimated monthly payment using typical terms (10% down, 72 months, 7.2%
// APR). Stays synchronous and default-compatible: it's called during render in
// VehicleCard/compare and inside the inventory "max monthly" filter predicate.
// The math itself lives in lib/payment.ts so the calculator and /finance agree.
export function estMonthly(
  price: number,
  opts?: { downPct?: number; term?: number; apr?: number; tradeIn?: number },
): number {
  const downPct = opts?.downPct ?? DEFAULT_TERMS.downPct;
  return monthlyPayment({
    price,
    down: price * downPct,
    tradeIn: opts?.tradeIn ?? 0,
    term: opts?.term ?? DEFAULT_TERMS.term,
    apr: opts?.apr ?? DEFAULT_TERMS.apr,
  });
}
