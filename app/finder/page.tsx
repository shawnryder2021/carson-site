'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { PageHeader } from '@/components/PageHeader';
import { DotsAnim } from '@/components/DotsAnim';
import { vehicleImageURL } from '@/data/vehicleImage';
import { INVENTORY } from '@/data/inventory';
import { fmtPrice, fmtMiles } from '@/lib/format';
import { complete } from '@/lib/ai';
import { listVehicles, AdminVehicle } from '@/lib/db';

type Answers = {
  useCase: string;
  budget: number;
  body: string;
  fuel: string;
  mustHaves: string[];
  notes: string;
};

type Match = { id: string; fit: number; why: string; consider: string };

const USE_CASES = [
  { v: 'commute', label: 'Daily commuting', icon: 'gauge' },
  { v: 'family', label: 'Family hauler', icon: 'car' },
  { v: 'adventure', label: 'Weekend adventures', icon: 'location' },
  { v: 'work', label: 'Work / towing', icon: 'shield' },
  { v: 'first', label: 'First car', icon: 'sparkles' },
  { v: 'fun', label: 'Something fun', icon: 'trend' },
];
const BODIES = ['No preference', 'SUV', 'Sedan', 'Truck', 'Coupe', 'Wagon'];
const FUELS = ['No preference', 'Gas', 'Hybrid', 'Electric'];
const MUST_HAVES = ['AWD / 4WD', 'Great MPG', 'Third row', 'Low mileage', 'Luxury feel', 'Tech & safety', 'Cargo space', 'Sporty'];

export default function FinderPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({ useCase: '', budget: 35000, body: 'No preference', fuel: 'No preference', mustHaves: [], notes: '' });
  const [thinking, setThinking] = useState(false);
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [inventory, setInventory] = useState<AdminVehicle[]>(INVENTORY as AdminVehicle[]);
  const [intro, setIntro] = useState('');

  useEffect(() => { listVehicles().then(v => { if (v.length) setInventory(v); }); }, []);

  const set = (patch: Partial<Answers>) => setAnswers(a => ({ ...a, ...patch }));
  const toggleMust = (m: string) => set({ mustHaves: answers.mustHaves.includes(m) ? answers.mustHaves.filter(x => x !== m) : [...answers.mustHaves, m] });

  const STEPS = ['What will you use it for?', "What's your budget?", 'Any body style preference?', 'Fuel preference?', 'Must-haves?', 'Anything else?'];

  const runMatch = async (refine?: string) => {
    setThinking(true);
    setMatches(null);
    const list = inventory.map(v => `${v.id}: ${v.year} ${v.make} ${v.model}, ${fmtPrice(v.price)}, ${fmtMiles(v.mileage)}, ${v.body}, ${v.fuel}, ${v.drive}`).join('\n');
    const prompt = `You are Carson AI, a sharp, honest car-matching expert. From the inventory below, pick the 3 BEST matches for this shopper and explain why each fits THEM specifically.

Shopper:
- Primary use: ${answers.useCase || 'unspecified'}
- Budget: about ${fmtPrice(answers.budget)}
- Body preference: ${answers.body}
- Fuel preference: ${answers.fuel}
- Must-haves: ${answers.mustHaves.join(', ') || 'none stated'}
- Notes: ${answers.notes || 'none'}
${refine ? `\nRefinement request: ${refine}` : ''}

Inventory:
${list}

Reply ONLY with JSON (no markdown):
{"intro":"1 warm sentence summarizing what you looked for.","matches":[{"id":"<vehicle id>","fit":<0-100 integer>,"why":"2 sentences on why this fits THIS shopper.","consider":"1 honest thing to consider."}]}
Pick exactly 3 matches, best first. Prefer vehicles near or under budget.`;

    try {
      const reply = await complete(prompt);
      const json = JSON.parse(reply.replace(/```json|```/g, '').trim());
      setIntro(json.intro || '');
      setMatches((json.matches || []).filter((m: Match) => inventory.some(v => v.id === m.id)).slice(0, 3));
    } catch {
      // Fallback: simple local scoring
      const scored = inventory
        .filter(v => v.price <= answers.budget * 1.1)
        .filter(v => answers.body === 'No preference' || v.body === answers.body)
        .filter(v => answers.fuel === 'No preference' || v.fuel === answers.fuel)
        .slice(0, 3)
        .map((v, i) => ({ id: v.id, fit: 90 - i * 7, why: `A solid match for your ${answers.useCase || 'needs'} within budget.`, consider: 'Book a test drive to confirm the fit.' }));
      setIntro("Here are a few that line up with what you told me.");
      setMatches(scored);
    }
    setThinking(false);
  };

  const fitColor = (n: number) => n >= 85 ? '#0F6B2D' : n >= 70 ? 'var(--teal-2)' : '#8A5400';

  // ── RESULTS ──
  if (matches) {
    return (
      <div className="page fade-in">
        <PageHeader eyebrow="Your AI matches" title="Here's what fits you." subtitle={intro} />
        <div className="container" style={{ maxWidth: 920, paddingBottom: 80 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {matches.map((m, i) => {
              const v = inventory.find(x => x.id === m.id);
              if (!v) return null;
              const photo = (v as any).images?.[0];
              return (
                <div key={m.id} className="rg" style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 18, padding: 20, display: 'grid', gridTemplateColumns: '220px 1fr', gap: 24, alignItems: 'center' }}>
                  <div onClick={() => router.push(`/vehicle/${v.id}`)} style={{ cursor: 'pointer', background: 'var(--bg-soft)', borderRadius: 14, aspectRatio: '4/3', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    <img src={photo || vehicleImageURL(v, { size: 300 })} alt="" style={photo ? { width: '100%', height: '100%', objectFit: 'cover' } : { width: '85%', height: '85%' }} />
                    {i === 0 && <span style={{ position: 'absolute', top: 10, left: 10, background: 'var(--teal)', color: 'white', fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 999, letterSpacing: '.04em' }}>BEST MATCH</span>}
                  </div>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      <div>
                        <div style={{ fontSize: 13, color: 'var(--muted)' }}>{v.year}</div>
                        <h3 style={{ fontFamily: 'var(--display)', fontSize: 24, fontWeight: 600, letterSpacing: '-.01em', margin: '2px 0 0' }}>{v.make} {v.model}</h3>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 700 }}>{fmtPrice(v.price)}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: fitColor(m.fit) }}>{m.fit}% match</div>
                      </div>
                    </div>
                    <p style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.55, margin: '12px 0 8px' }}>
                      <Icon name="sparkles" size={13} style={{ color: 'var(--teal)', verticalAlign: '-1px', marginRight: 4 }} />{m.why}
                    </p>
                    <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5, margin: '0 0 14px' }}>
                      <strong>Consider:</strong> {m.consider}
                    </p>
                    <button onClick={() => router.push(`/vehicle/${v.id}`)} className="btn btn-primary btn-sm">
                      View this vehicle <Icon name="arrowRight" size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Refine */}
          <div style={{ marginTop: 28, background: 'var(--bg-soft)', borderRadius: 16, padding: '20px 22px', textAlign: 'center' }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Not quite right? Refine your matches:</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={() => runMatch('Show cheaper options.')} className="btn btn-ghost btn-sm">Show me cheaper</button>
              <button onClick={() => runMatch('Show roomier / bigger options.')} className="btn btn-ghost btn-sm">Something bigger</button>
              <button onClick={() => runMatch('Prioritize fuel efficiency.')} className="btn btn-ghost btn-sm">Better on gas</button>
              <button onClick={() => { setMatches(null); setStep(0); }} className="btn btn-dark btn-sm">Start over</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── THINKING ──
  if (thinking) {
    return (
      <div className="page fade-in">
        <div className="container" style={{ maxWidth: 600, padding: '120px 20px', textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, margin: '0 auto 20px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--teal), #5a8aff)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', animation: 'ai-pulse 1.6s ease-in-out infinite' }}>
            <Icon name="sparkles" size={28} />
          </div>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: 26, fontWeight: 600, margin: '0 0 8px' }}>Finding your matches<DotsAnim /></h2>
          <p style={{ fontSize: 15, color: 'var(--muted)' }}>Carson AI is weighing {inventory.length} vehicles against what matters to you.</p>
        </div>
      </div>
    );
  }

  // ── QUIZ ──
  const canAdvance = step !== 0 || !!answers.useCase;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="page fade-in">
      <PageHeader eyebrow="AI Finder" title="Let's find your car." subtitle="Answer a few quick questions and Carson AI will match you to the best vehicles on our lot — with honest reasoning." />
      <div className="container" style={{ maxWidth: 680, paddingBottom: 80 }}>
        {/* Progress */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
          {STEPS.map((_, i) => (
            <div key={i} style={{ flex: 1, height: 5, borderRadius: 999, background: i <= step ? 'var(--teal)' : 'var(--line)', transition: 'background 200ms' }} />
          ))}
        </div>

        <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 18, padding: '32px 34px', minHeight: 320 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 6 }}>Step {step + 1} of {STEPS.length}</div>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: 26, fontWeight: 600, letterSpacing: '-.01em', margin: '0 0 22px' }}>{STEPS[step]}</h2>

          {step === 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
              {USE_CASES.map(u => (
                <button key={u.v} onClick={() => { set({ useCase: u.v }); setStep(1); }} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '16px 18px', borderRadius: 12,
                  background: answers.useCase === u.v ? 'var(--ink)' : 'white', color: answers.useCase === u.v ? 'white' : 'var(--ink)',
                  border: '1px solid ' + (answers.useCase === u.v ? 'var(--ink)' : 'var(--line)'), cursor: 'pointer', fontFamily: 'inherit', fontSize: 15, fontWeight: 600, textAlign: 'left',
                }}>
                  <Icon name={u.icon as any} size={20} style={{ color: answers.useCase === u.v ? 'white' : 'var(--teal)' }} /> {u.label}
                </button>
              ))}
            </div>
          )}

          {step === 1 && (
            <div>
              <div style={{ fontFamily: 'var(--display)', fontSize: 40, fontWeight: 700, textAlign: 'center', marginBottom: 8 }}>{fmtPrice(answers.budget)}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', marginBottom: 20 }}>Approximate budget (purchase price)</div>
              <input type="range" min={15000} max={90000} step={1000} value={answers.budget} onChange={e => set({ budget: +e.target.value })} style={{ width: '100%', accentColor: 'var(--teal)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--muted)', marginTop: 6 }}><span>$15k</span><span>$90k+</span></div>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {BODIES.map(b => (
                <button key={b} onClick={() => set({ body: b })} style={chip(answers.body === b)}>{b}</button>
              ))}
            </div>
          )}

          {step === 3 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {FUELS.map(f => (
                <button key={f} onClick={() => set({ fuel: f })} style={chip(answers.fuel === f)}>{f}</button>
              ))}
            </div>
          )}

          {step === 4 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {MUST_HAVES.map(m => (
                <button key={m} onClick={() => toggleMust(m)} style={chip(answers.mustHaves.includes(m))}>{m}</button>
              ))}
            </div>
          )}

          {step === 5 && (
            <textarea
              className="input"
              value={answers.notes}
              onChange={e => set({ notes: e.target.value })}
              placeholder="e.g., I drive 80 miles a day, have two kids and a dog, and want something reliable that won't break the bank."
              style={{ minHeight: 120, fontFamily: 'inherit', resize: 'vertical' }}
            />
          )}

          {/* Nav buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28 }}>
            <button onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0} className="btn btn-ghost" style={{ opacity: step === 0 ? 0.4 : 1 }}>
              <Icon name="arrowLeft" size={14} /> Back
            </button>
            {isLast ? (
              <button onClick={() => runMatch()} className="btn btn-primary btn-lg"><Icon name="sparkles" size={16} /> Find my matches</button>
            ) : (
              <button onClick={() => setStep(s => s + 1)} disabled={!canAdvance} className="btn btn-primary">Next <Icon name="arrowRight" size={14} /></button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function chip(active: boolean): React.CSSProperties {
  return {
    padding: '10px 18px', borderRadius: 999,
    background: active ? 'var(--ink)' : 'white', color: active ? 'white' : 'var(--ink)',
    border: '1px solid ' + (active ? 'var(--ink)' : 'var(--line)'), cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
  };
}
