export function fmtPrice(n: number): string {
  return '$' + n.toLocaleString();
}

export function fmtMiles(n: number): string {
  return n.toLocaleString() + ' km';
}

// Estimated monthly payment using typical terms:
// 10% down, 72-month term, 7.2% APR (good credit).
export function estMonthly(price: number, opts?: { downPct?: number; term?: number; apr?: number }): number {
  const downPct = opts?.downPct ?? 0.1;
  const term = opts?.term ?? 72;
  const apr = opts?.apr ?? 7.2;
  const principal = price * (1 - downPct);
  const r = apr / 1200;
  const payment = (principal * r) / (1 - Math.pow(1 + r, -term));
  return Math.round(payment);
}
