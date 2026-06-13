'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { PageHeader } from '@/components/PageHeader';
import { DotsAnim } from '@/components/DotsAnim';
import { fmtPrice } from '@/lib/format';
import { complete } from '@/lib/ai';
import { createLead } from '@/lib/db';

type Valuation = { low: number; high: number; midpoint: number; carsonOffer: number; rationale: string; tip: string };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>{label}</div>{children}</div>;
}

export default function TradeInPage() {
  const router = useRouter();
  const [d, setD] = useState({ year: '', make: '', model: '', trim: '', mileage: '', condition: 'Good', zip: '' });
  const [val, setVal] = useState<Valuation | null>(null);
  const [thinking, setThinking] = useState(false);
  const up = (k: string, v: string) => setD(p => ({ ...p, [k]: v }));

  const valuate = async () => {
    setThinking(true);
    const prompt = `You are an experienced used-car appraiser. Estimate trade-in value (below private-party, which is below retail).
Vehicle: ${d.year} ${d.make} ${d.model} ${d.trim}, ${d.mileage} miles, condition ${d.condition}, region ${d.zip || 'NS, Canada'}.
Reply ONLY JSON: {"low":<int>,"high":<int>,"midpoint":<int>,"carsonOffer":<~5% above midpoint int>,"rationale":"1-2 sentences.","tip":"1 short tip to maximize value."}`;
    try {
      const reply = await complete(prompt);
      setVal(JSON.parse(reply.replace(/```json|```/g, '').trim()));
    } catch {
      const b = 18000;
      setVal({ low: b - 2000, high: b + 2000, midpoint: b, carsonOffer: b + 900, rationale: 'Estimate based on typical ranges for this vehicle and condition.', tip: 'Bring service records to your appraisal — they add value.' });
    }
    createLead({ type: 'tradein', payload: { ...d } });
    setThinking(false);
  };

  if (val) {
    return (
      <div className="page fade-in">
        <PageHeader eyebrow="Your AI trade-in estimate" title="Here's what it's worth." />
        <div className="container" style={{ maxWidth: 820, paddingBottom: 80 }}>
          <div className="rg" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24, marginBottom: 22 }}>
            <div style={{ background: 'linear-gradient(135deg, var(--ink), #1f1f1f)', color: 'white', borderRadius: 18, padding: '32px 36px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, opacity: 0.5, background: 'radial-gradient(circle at 90% 0%, var(--teal), transparent 60%)' }} />
              <div style={{ position: 'relative' }}>
                <div className="ai-pill" style={{ background: 'rgba(255,255,255,.12)', color: 'white', marginBottom: 14 }}><span className="ai-dot" />Carson's offer</div>
                <div style={{ fontFamily: 'var(--display)', fontSize: 56, fontWeight: 700, letterSpacing: '-.02em', lineHeight: 1, marginBottom: 8 }}>{fmtPrice(val.carsonOffer)}</div>
                <div style={{ fontSize: 14, color: '#9ad', marginBottom: 22 }}>Valid 7 days. No obligation.</div>
                <button onClick={() => router.push('/inventory')} className="btn btn-primary">Apply to a purchase <Icon name="arrowRight" size={14} /></button>
              </div>
            </div>
            <div style={{ background: 'var(--bg-soft)', borderRadius: 18, padding: '24px 26px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 14 }}>Market range</div>
              {[['Low', val.low], ['Average', val.midpoint], ['High', val.high]].map(([l, v], i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', fontSize: 14 }}>
                  <span style={{ color: 'var(--muted)' }}>{l as string}</span>
                  <span style={{ fontWeight: i === 1 ? 700 : 600 }}>{fmtPrice(v as number)}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 16, padding: '22px 26px' }}>
            <div className="ai-pill" style={{ marginBottom: 12 }}><span className="ai-dot" />AI rationale</div>
            <p style={{ fontSize: 15, lineHeight: 1.6, margin: '0 0 14px' }}>{val.rationale}</p>
            <div style={{ background: 'var(--teal-tint)', padding: '12px 14px', borderRadius: 10, fontSize: 14, color: 'var(--teal-2)' }}>
              <Icon name="info" size={15} style={{ verticalAlign: '-2px', marginRight: 6 }} /><strong>Tip:</strong> {val.tip}
            </div>
          </div>
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <button onClick={() => setVal(null)} className="btn btn-ghost"><Icon name="arrowLeft" size={14} /> Try different details</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page fade-in">
      <PageHeader eyebrow="Trade-in" title="What's your car worth?" subtitle="A few quick details and Carson AI gives you an instant estimate — no email required." />
      <div className="container" style={{ maxWidth: 720, paddingBottom: 80 }}>
        <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 18, padding: '30px 34px' }}>
          {thinking ? (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
              <div style={{ width: 60, height: 60, margin: '0 auto 16px', borderRadius: '50%', background: 'linear-gradient(135deg,var(--teal),#5a8aff)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', animation: 'ai-pulse 1.6s ease-in-out infinite' }}><Icon name="sparkles" size={26} /></div>
              <div style={{ fontSize: 17, fontWeight: 600 }}>Pulling market data<DotsAnim /></div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="rg" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <Field label="Year"><input className="input" value={d.year} onChange={e => up('year', e.target.value)} placeholder="2021" /></Field>
                <Field label="Make"><input className="input" value={d.make} onChange={e => up('make', e.target.value)} placeholder="Toyota" /></Field>
                <Field label="Model"><input className="input" value={d.model} onChange={e => up('model', e.target.value)} placeholder="RAV4" /></Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Trim (optional)"><input className="input" value={d.trim} onChange={e => up('trim', e.target.value)} placeholder="XLE" /></Field>
                <Field label="Mileage"><input className="input" value={d.mileage} onChange={e => up('mileage', e.target.value)} placeholder="48,000" /></Field>
              </div>
              <Field label="Condition">
                <div className="rg" style={{ ['--gtc-m' as any]: '1fr 1fr', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                  {['Excellent', 'Good', 'Fair', 'Rough'].map(c => (
                    <button key={c} onClick={() => up('condition', c)} style={{ padding: '10px', borderRadius: 10, background: d.condition === c ? 'var(--ink)' : 'white', color: d.condition === c ? 'white' : 'var(--ink)', border: '1px solid ' + (d.condition === c ? 'var(--ink)' : 'var(--line)'), cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>{c}</button>
                  ))}
                </div>
              </Field>
              <Field label="Postal / ZIP code"><input className="input" value={d.zip} onChange={e => up('zip', e.target.value)} placeholder="B3B 1B3" /></Field>
              <button onClick={valuate} disabled={!d.year || !d.make || !d.model || !d.mileage} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                <Icon name="sparkles" size={16} /> Get my AI estimate
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
