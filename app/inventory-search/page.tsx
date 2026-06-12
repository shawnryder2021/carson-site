'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { complete } from '@/lib/ai';
import { listVehicles } from '@/lib/db';
import { fmtPrice } from '@/lib/format';
import { vehicleImageURL } from '@/data/vehicleImage';

const BODY_TYPES = ['SUV', 'Sedan', 'Truck', 'Coupe', 'Wagon', 'Hatchback'];
const FUEL_TYPES = ['Any', 'Gas', 'Hybrid', 'Electric'];
const FEATURES = ['AWD/4WD', 'Leather interior', 'Sunroof', 'Apple CarPlay', 'Navigation', 'Backup camera'];

export default function InventorySearch() {
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'loading' | 'results'>('form');
  const [results, setResults] = useState<any[]>([]);

  // Form inputs
  const [body, setBody] = useState('');
  const [budgetMin, setBudgetMin] = useState(15000);
  const [budgetMax, setBudgetMax] = useState(35000);
  const [fuel, setFuel] = useState('Any');
  const [features, setFeatures] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  const search = async () => {
    if (!body) {
      alert('Please select a vehicle type');
      return;
    }

    setStep('loading');

    try {
      const vehicles = await listVehicles({ includeHidden: false });
      const inventoryList = vehicles.map(v => `${v.year} ${v.make} ${v.model} ($${v.price}) - ${v.body}, ${v.fuel}, ${v.mileage.toLocaleString()} km`).join('\n');

      const prompt = `You are a friendly Carson Exports sales assistant. A customer is looking for a vehicle.

Their preferences:
- Body type: ${body}
- Budget: $${budgetMin.toLocaleString()} - $${budgetMax.toLocaleString()}
- Fuel: ${fuel}
- Features: ${features.length > 0 ? features.join(', ') : 'Any'}
- Additional notes: ${notes || 'None'}

Here is our current inventory:
${inventoryList}

Recommend the 3-5 BEST matching vehicles from our inventory. For each, explain why it's a good fit for this customer.

Format your response as:
1. [Year Make Model] - $[Price]
   Why: [Explanation]

2. [Year Make Model] - $[Price]
   Why: [Explanation]

etc.`;

      const reply = await complete(prompt);
      // Parse the AI response to extract vehicle recommendations
      const lines = reply.split('\n').filter(l => l.trim());
      const recommended: string[] = [];

      lines.forEach(line => {
        const match = line.match(/(\d{4})\s+(\w+)\s+(\w+)/);
        if (match) {
          const [, year, make, model] = match;
          const vehicle = vehicles.find(
            v => v.year === parseInt(year) && v.make.toLowerCase() === make.toLowerCase() && v.model.toLowerCase() === model.toLowerCase()
          );
          if (vehicle && !recommended.includes(vehicle.id)) {
            recommended.push(vehicle.id);
          }
        }
      });

      const matched = vehicles.filter(v => recommended.includes(v.id));
      setResults(
        matched.length > 0
          ? matched.slice(0, 5)
          : vehicles.filter(v => {
              const priceMatch = v.price >= budgetMin && v.price <= budgetMax;
              const bodyMatch = v.body.toLowerCase() === body.toLowerCase();
              const fuelMatch = fuel === 'Any' || v.fuel.toLowerCase() === fuel.toLowerCase();
              return priceMatch && bodyMatch && fuelMatch;
            }).slice(0, 5)
      );
      setStep('results');
    } catch (e) {
      alert('Search failed. Please try again.');
      setStep('form');
    }
  };

  if (step === 'form') {
    return (
      <div className="page fade-in">
        <div style={{ background: 'linear-gradient(135deg, var(--teal), #5a8aff)', color: 'white', padding: '60px 40px', textAlign: 'center', marginBottom: 40 }}>
          <div style={{ maxWidth: 700, margin: '0 auto' }}>
            <div style={{ fontSize: 14, fontWeight: 700, opacity: 0.9, marginBottom: 12, letterSpacing: '.05em', textTransform: 'uppercase' }}>
              <Icon name="sparkles" size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />AI Inventory Search
            </div>
            <h1 style={{ fontFamily: 'var(--display)', fontSize: 40, fontWeight: 600, letterSpacing: '-.02em', lineHeight: 1.1, margin: '0 0 12px' }}>
              Find Your Perfect Car
            </h1>
            <p style={{ fontSize: 16, opacity: 0.95, margin: 0, lineHeight: 1.6 }}>
              Tell us what you're looking for, and let Carson AI recommend the best matches from our inventory.
            </p>
          </div>
        </div>

        <div className="container" style={{ maxWidth: 600, paddingBottom: 60 }}>
          <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 16, padding: '30px 36px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Body type */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  What type of vehicle? *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                  {BODY_TYPES.map(t => (
                    <button
                      key={t}
                      onClick={() => setBody(t)}
                      style={{
                        padding: '10px 12px',
                        background: body === t ? 'var(--teal)' : 'var(--bg-soft)',
                        color: body === t ? 'white' : 'var(--ink)',
                        border: '1px solid ' + (body === t ? 'var(--teal)' : 'var(--line)'),
                        borderRadius: 10,
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: 13,
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  Budget
                </label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="number" className="input" value={budgetMin} onChange={e => setBudgetMin(parseInt(e.target.value))} style={{ flex: 1 }} />
                  <span style={{ color: 'var(--muted)', fontWeight: 600 }}>to</span>
                  <input type="number" className="input" value={budgetMax} onChange={e => setBudgetMax(parseInt(e.target.value))} style={{ flex: 1 }} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
                  ${budgetMin.toLocaleString()} - ${budgetMax.toLocaleString()}
                </div>
              </div>

              {/* Fuel type */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  Fuel type
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {FUEL_TYPES.map(t => (
                    <button
                      key={t}
                      onClick={() => setFuel(t)}
                      style={{
                        padding: '8px 12px',
                        background: fuel === t ? 'var(--teal)' : 'var(--bg-soft)',
                        color: fuel === t ? 'white' : 'var(--ink)',
                        border: '1px solid ' + (fuel === t ? 'var(--teal)' : 'var(--line)'),
                        borderRadius: 8,
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: 13,
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Features */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  Must-have features (optional)
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                  {FEATURES.map(f => (
                    <label key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={features.includes(f)}
                        onChange={e => setFeatures(e.target.checked ? [...features, f] : features.filter(x => x !== f))}
                        style={{ cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: 13 }}>{f}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                  Anything else? (optional)
                </label>
                <textarea
                  className="input"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g., 'I have 3 kids', 'I work on a farm', 'First car for my teen'"
                  style={{ minHeight: 80, fontFamily: 'inherit', resize: 'vertical' }}
                />
              </div>

              {/* Submit */}
              <button onClick={search} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                <Icon name="sparkles" size={16} /> Search with AI
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'loading') {
    return (
      <div className="page fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <Icon name="sparkles" size={40} style={{ opacity: 0.3, marginBottom: 16 }} />
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Finding your matches…</div>
          <div style={{ fontSize: 14, color: 'var(--muted)' }}>This usually takes a few seconds</div>
        </div>
      </div>
    );
  }

  return (
    <div className="page fade-in">
      <div style={{ background: 'var(--bg-soft)', padding: '40px 20px', marginBottom: 40, borderRadius: 0 }}>
        <div className="container" style={{ maxWidth: 1000, textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 32, fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 12px' }}>
            Your AI-Recommended Matches
          </h1>
          <p style={{ fontSize: 15, color: 'var(--muted)', margin: 0 }}>
            Based on your preferences, here are the best vehicles in our inventory for you.
          </p>
          <button onClick={() => setStep('form')} className="btn btn-ghost btn-sm" style={{ marginTop: 12 }}>
            <Icon name="arrowLeft" size={13} /> New search
          </button>
        </div>
      </div>

      <div className="container" style={{ maxWidth: 1000, paddingBottom: 60 }}>
        {results.length === 0 ? (
          <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, padding: '40px', textAlign: 'center' }}>
            <Icon name="search" size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>No matches found</div>
            <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 16 }}>Try adjusting your budget or preferences</div>
            <button onClick={() => setStep('form')} className="btn btn-primary btn-sm">
              New search
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {results.map(v => (
              <div
                key={v.id}
                onClick={() => router.push(`/vehicle/${v.id}`)}
                style={{
                  background: 'white',
                  border: '1px solid var(--line)',
                  borderRadius: 12,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.1)';
                  (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
                  (e.currentTarget as HTMLDivElement).style.transform = 'none';
                }}
              >
                <div style={{ width: '100%', height: 160, background: 'var(--bg-soft)', overflow: 'hidden' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={(v as any).images?.[0] || vehicleImageURL(v, { size: 280 })} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div style={{ padding: '14px 16px' }}>
                  <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>
                    {v.year} {v.make}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>{v.model}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                    <div style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 600, color: 'var(--teal)' }}>{fmtPrice(v.price)}</div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span><Icon name="gauge" size={11} style={{ verticalAlign: '-1px' }} /> {(v.mileage / 1000).toFixed(0)}k km</span>
                    <span><Icon name="fuel" size={11} style={{ verticalAlign: '-1px' }} /> {v.fuel}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
