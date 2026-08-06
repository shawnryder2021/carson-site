'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { PageHeader } from '@/components/PageHeader';
import { DotsAnim } from '@/components/DotsAnim';
import { INVENTORY } from '@/data/inventory';
import { fmtPrice } from '@/lib/format';
import { complete } from '@/lib/ai';
import { listVehicles, createLead, AdminVehicle } from '@/lib/db';
import { monthlyPayment, financedAmount, CREDIT_TIERS, TERM_OPTIONS, aprForTier } from '@/lib/payment';

type Result = { verdict: string; headline: string; paymentPercent: number; advice: string; tips: string[] };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>{label}</div>{children}</div>;
}

function FinanceContent() {
  const params = useSearchParams();
  const [inv, setInv] = useState<AdminVehicle[]>(INVENTORY as AdminVehicle[]);
  const [vehicle, setVehicle] = useState<AdminVehicle | null>(null);
  const [info, setInfo] = useState({ income: 60000, down: 3000, tradeIn: 0, term: 72, score: 'good' });
  const [result, setResult] = useState<Result | null>(null);
  const [thinking, setThinking] = useState(false);

  useEffect(() => {
    listVehicles().then(v => {
      if (v.length) setInv(v);
      const id = params.get('vehicleId');
      if (id) setVehicle(v.find(x => x.id === id) || null);
    });
  }, [params]);

  const apr = aprForTier(info.score);
  const price = vehicle ? vehicle.price : 25000;
  const principal = financedAmount(price, info.down, info.tradeIn);
  const monthly = monthlyPayment({ price, down: info.down, tradeIn: info.tradeIn, term: info.term, apr });

  const check = async () => {
    setThinking(true);
    const prompt = `You're Carson AI, a friendly, honest financing advisor. Assess loan fit.
Income $${info.income}/yr, credit ${info.score}, down $${info.down}, trade-in $${info.tradeIn}, term ${info.term}mo${vehicle ? `, vehicle ${vehicle.year} ${vehicle.make} ${vehicle.model} $${vehicle.price}` : ''}, est payment $${monthly}/mo.
Take-home ~75% of gross/12. Under 15% of take-home is ideal, 15-20% manageable, over 20% tight.
Reply ONLY JSON: {"verdict":"Comfortable"|"Manageable"|"Stretch"|"Tight","headline":"1 friendly sentence","paymentPercent":<int>,"advice":"2-3 sentences","tips":["t1","t2","t3"]}`;
    try {
      setResult(JSON.parse((await complete(prompt)).replace(/```json|```/g, '').trim()));
    } catch {
      const pct = Math.round(monthly / (info.income * 0.75 / 12) * 100);
      setResult({ verdict: pct < 15 ? 'Comfortable' : pct < 20 ? 'Manageable' : 'Stretch', headline: 'Here’s how this payment fits your budget.', paymentPercent: pct, advice: 'A larger down payment or shorter term would lower your monthly cost.', tips: ['Add to your down payment to save monthly', 'Aim for 60 months to pay off faster', 'Get pre-approved to negotiate harder'] });
    }
    createLead({ type: 'finance', vehicleId: vehicle?.id, payload: { income: info.income, down: info.down, tradeIn: info.tradeIn, term: info.term, credit: info.score, monthly } });
    setThinking(false);
  };

  const vColor: Record<string, string> = { Comfortable: '#0F6B2D', Manageable: 'var(--teal-2)', Stretch: '#8A5400', Tight: '#A8232C' };

  return (
    <div className="page fade-in">
      <PageHeader eyebrow="Financing" title="Get pre-qualified in 60 seconds." subtitle="Soft check — won't affect your score. Carson AI tells you honestly if it fits your budget." />
      <div className="container" style={{ maxWidth: 1040, paddingBottom: 80 }}>
        <div className="rg" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 30 }}>
          <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 18, padding: '28px 32px' }}>
            <Field label="Vehicle (optional)">
              <select className="select" value={vehicle?.id || ''} onChange={e => setVehicle(inv.find(v => v.id === e.target.value) || null)}>
                <option value="">Browse without a specific vehicle</option>
                {inv.map(v => <option key={v.id} value={v.id}>{v.year} {v.make} {v.model} — {fmtPrice(v.price)}</option>)}
              </select>
            </Field>
            <div style={{ height: 18 }} />
            <Field label={`Annual income: ${fmtPrice(info.income)}`}><input type="range" min={20000} max={250000} step={5000} value={info.income} onChange={e => setInfo(i => ({ ...i, income: +e.target.value }))} style={{ width: '100%', accentColor: 'var(--teal)' }} /></Field>
            <div style={{ height: 18 }} />
            <Field label={`Down payment: ${fmtPrice(info.down)}`}><input type="range" min={0} max={25000} step={500} value={info.down} onChange={e => setInfo(i => ({ ...i, down: +e.target.value }))} style={{ width: '100%', accentColor: 'var(--teal)' }} /></Field>
            <div style={{ height: 18 }} />
            <Field label={`Trade-in value: ${fmtPrice(info.tradeIn)}`}><input type="range" min={0} max={40000} step={500} value={info.tradeIn} onChange={e => setInfo(i => ({ ...i, tradeIn: +e.target.value }))} style={{ width: '100%', accentColor: 'var(--teal)' }} /></Field>
            <div style={{ height: 18 }} />
            <Field label="Loan term">
              <div style={{ display: 'flex', gap: 8 }}>
                {TERM_OPTIONS.map(t => <button key={t} onClick={() => setInfo(i => ({ ...i, term: t }))} style={{ flex: 1, padding: '10px', borderRadius: 10, background: info.term === t ? 'var(--ink)' : 'white', color: info.term === t ? 'white' : 'var(--ink)', border: '1px solid ' + (info.term === t ? 'var(--ink)' : 'var(--line)'), cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>{t}mo</button>)}
              </div>
            </Field>
            <div style={{ height: 18 }} />
            <Field label="Credit tier">
              <div className="rg" style={{ ['--gtc-m' as any]: '1fr 1fr', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                {CREDIT_TIERS.map(({ key: v, range: r }) => (
                  <button key={v} onClick={() => setInfo(i => ({ ...i, score: v }))} style={{ padding: '10px 6px', borderRadius: 10, background: info.score === v ? 'var(--ink)' : 'white', color: info.score === v ? 'white' : 'var(--ink)', border: '1px solid ' + (info.score === v ? 'var(--ink)' : 'var(--line)'), cursor: 'pointer', fontFamily: 'inherit' }}>
                    <div style={{ fontWeight: 700, fontSize: 13, textTransform: 'capitalize' }}>{v}</div>
                    <div style={{ fontSize: 11, color: info.score === v ? '#cbd5dc' : 'var(--muted)' }}>{r}</div>
                  </button>
                ))}
              </div>
            </Field>
            <div style={{ height: 24 }} />
            <button onClick={check} className="btn btn-primary btn-lg" style={{ width: '100%' }}><Icon name="sparkles" size={16} /> Check my fit with Carson AI</button>
          </div>

          <div>
            <div style={{ background: 'var(--ink)', color: 'white', borderRadius: 18, padding: '28px 30px', marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, opacity: 0.4, background: 'radial-gradient(circle at 100% 0%, var(--teal), transparent 50%)' }} />
              <div style={{ position: 'relative' }}>
                <div style={{ fontSize: 11, color: '#9ad', letterSpacing: '.06em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>Estimated monthly</div>
                <div style={{ fontFamily: 'var(--display)', fontSize: 56, fontWeight: 700, lineHeight: 1 }}>{fmtPrice(monthly)}</div>
                <div style={{ fontSize: 13, color: '#9ad', marginTop: 6 }}>{fmtPrice(principal)} financed · {apr.toFixed(1)}% APR · {info.term}mo</div>
              </div>
            </div>
            {thinking && <div style={{ background: 'var(--bg-soft)', borderRadius: 14, padding: 24, textAlign: 'center', fontSize: 14, fontWeight: 600 }}><Icon name="sparkles" size={24} style={{ color: 'var(--teal)', marginBottom: 8 }} /><div>Carson AI is analyzing<DotsAnim /></div></div>}
            {result && !thinking && (
              <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, padding: '22px 24px', animation: 'fadeIn 320ms both' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{ padding: '4px 10px', borderRadius: 999, background: (vColor[result.verdict] || 'var(--teal-2)') + '22', color: vColor[result.verdict] || 'var(--teal-2)', fontSize: 12, fontWeight: 700 }}>{result.verdict?.toUpperCase()}</span>
                  <span style={{ fontSize: 13, color: 'var(--muted)' }}>{result.paymentPercent}% of take-home</span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 10 }}>{result.headline}</div>
                <p style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.55, margin: '0 0 14px' }}>{result.advice}</p>
                {result.tips?.map(t => <div key={t} style={{ fontSize: 13, display: 'flex', gap: 8, marginBottom: 6 }}><Icon name="check" size={14} style={{ color: 'var(--teal)', flexShrink: 0, marginTop: 2 }} />{t}</div>)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FinancePage() {
  return <Suspense><FinanceContent /></Suspense>;
}
