'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { VehicleCard } from '@/components/VehicleCard';
import { DotsAnim } from '@/components/DotsAnim';
import { Modal } from '@/components/Modal';
import { INVENTORY } from '@/data/inventory';
import { vehicleImageURL } from '@/data/vehicleImage';
import { fmtPrice, fmtMiles, estMonthly } from '@/lib/format';
import { complete } from '@/lib/ai';
import { useSaved } from '@/context/SavedContext';

const PRESET_QUESTIONS = [
  'Is this a fair price?',
  'How reliable is this model?',
  'What should I check at the test drive?',
  'What are the typical maintenance costs?',
];

export default function VehiclePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { saved, toggleSave } = useSaved();
  const vehicle = INVENTORY.find(v => v.id === params.id);
  const isSaved = saved.includes(params.id);

  const [tab, setTab] = useState<'overview' | 'specs' | 'history' | 'inspection'>('overview');
  const [activeImage, setActiveImage] = useState(0);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiReply, setAiReply] = useState<string | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const [modal, setModal] = useState<null | 'testdrive' | 'video' | 'delivery' | 'otd'>(null);
  const [submitted, setSubmitted] = useState(false);

  // Test drive state
  const [tdDate, setTdDate] = useState('');
  const [tdTime, setTdTime] = useState('');
  const [tdName, setTdName] = useState('');
  const [tdPhone, setTdPhone] = useState('');

  // Video request state
  const [videoFocus, setVideoFocus] = useState<string[]>([]);
  const [videoEmail, setVideoEmail] = useState('');
  const [videoNotes, setVideoNotes] = useState('');

  // Delivery state
  const [deliveryZip, setDeliveryZip] = useState('');
  const [deliveryDistance, setDeliveryDistance] = useState<number | null>(null);

  // OTD state
  const [otdState, setOtdState] = useState('CA');

  const finishModal = () => {
    setSubmitted(true);
    setTimeout(() => {
      setModal(null);
      setSubmitted(false);
      setTdDate(''); setTdTime(''); setTdName(''); setTdPhone('');
      setVideoFocus([]); setVideoEmail(''); setVideoNotes('');
      setDeliveryZip(''); setDeliveryDistance(null);
    }, 1800);
  };

  if (!vehicle) {
    return (
      <div className="page fade-in" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 32, fontWeight: 600 }}>Vehicle not found</h1>
        <p style={{ color: 'var(--muted)', marginTop: 12 }}>This car may have already been sold.</p>
        <button onClick={() => router.push('/inventory')} className="btn btn-primary" style={{ marginTop: 24 }}>
          Browse inventory <Icon name="arrowRight" size={14}/>
        </button>
      </div>
    );
  }

  const similar = INVENTORY.filter(v => v.id !== vehicle.id && (v.body === vehicle.body || v.fuel === vehicle.fuel)).slice(0, 4);

  // Fair price estimate
  const marketLow = Math.round(vehicle.price * 0.96);
  const marketHigh = Math.round(vehicle.price * 1.04);
  const isBelowMarket = vehicle.price < (marketLow + marketHigh) / 2;
  const savings = Math.round((marketLow + marketHigh) / 2) - vehicle.price;

  const askAI = async (question?: string) => {
    const q = question || aiQuestion;
    if (!q.trim()) return;
    setAiThinking(true);
    setAiReply(null);

    const prompt = `You're Carson AI, a helpful car shopping assistant. A customer is looking at this vehicle:
${vehicle.year} ${vehicle.make} ${vehicle.model}
Price: ${fmtPrice(vehicle.price)}
Mileage: ${fmtMiles(vehicle.mileage)}
Body: ${vehicle.body}, Fuel: ${vehicle.fuel}, Drive: ${vehicle.drive}
Exterior: ${vehicle.exterior}, Interior: ${vehicle.interior}

Customer's question: "${q}"

Answer briefly (2-4 sentences) in a friendly, honest, helpful tone. Be specific to this vehicle. Don't be salesy.`;

    try {
      const reply = await complete(prompt);
      setAiReply(reply);
    } catch {
      setAiReply("I'm having trouble thinking right now, but our team can help. Call (555) 234-9090.");
    }
    setAiThinking(false);
    setAiQuestion('');
  };

  const specs = [
    { label: 'Year', value: vehicle.year },
    { label: 'Make', value: vehicle.make },
    { label: 'Model', value: vehicle.model },
    { label: 'Mileage', value: fmtMiles(vehicle.mileage) },
    { label: 'Body Style', value: vehicle.body },
    { label: 'Fuel Type', value: vehicle.fuel },
    { label: 'Drivetrain', value: vehicle.drive },
    { label: 'Exterior', value: vehicle.exterior },
    { label: 'Interior', value: vehicle.interior },
    { label: 'VIN', value: 'CXN' + vehicle.id.slice(-6).toUpperCase() + 'XXXXXX' },
  ];

  const history = [
    { date: '2 weeks ago', event: 'Arrived at Carson lot', detail: 'Passed 142-point inspection' },
    { date: '1 month ago', event: 'Previous owner trade-in', detail: 'Single owner, no accidents reported' },
    { date: '6 months ago', event: 'Routine maintenance', detail: 'Oil change, tire rotation' },
    { date: '1 year ago', event: 'Service record', detail: 'Brake pad replacement (factory service)' },
    { date: `${new Date().getFullYear() - vehicle.year} years ago`, event: 'First registration', detail: 'Original purchase, clean title' },
  ];

  const inspectionCategories = [
    { name: 'Engine & Transmission', score: '24/24', status: 'pass' },
    { name: 'Brakes & Suspension', score: '18/18', status: 'pass' },
    { name: 'Electrical Systems', score: '22/22', status: 'pass' },
    { name: 'Body & Paint', score: '14/15', status: 'pass' },
    { name: 'Interior Condition', score: '18/18', status: 'pass' },
    { name: 'Tires & Wheels', score: '12/12', status: 'pass' },
    { name: 'Safety Systems', score: '20/20', status: 'pass' },
    { name: 'Fluids & Filters', score: '14/14', status: 'pass' },
  ];

  return (
    <div className="page fade-in">
      <div className="container" style={{ maxWidth: 1400, padding: '24px 20px 80px' }}>
        {/* Breadcrumb */}
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
          <button onClick={() => router.push('/inventory')} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>
            ← Back to inventory
          </button>
        </div>

        {/* Top quick-actions strip */}
        <div style={{
          background: 'var(--bg-soft)', border: '1px solid var(--line)', borderRadius: 14,
          padding: '14px 18px', marginBottom: 24,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                {vehicle.year} {vehicle.make} {vehicle.model}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {fmtPrice(vehicle.price)} · {fmtMiles(vehicle.mileage)}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => setModal('testdrive')} className="btn btn-primary btn-sm">
              <Icon name="car" size={13} /> Book test drive
            </button>
            <button onClick={() => setModal('otd')} className="btn btn-dark btn-sm">
              <Icon name="dollar" size={13} /> Out-the-door price
            </button>
            <button onClick={() => setModal('video')} className="btn btn-ghost btn-sm">
              <Icon name="sparkles" size={13} /> Request video
            </button>
            <button onClick={() => setModal('delivery')} className="btn btn-ghost btn-sm">
              <Icon name="location" size={13} /> Deliver to me
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 40, alignItems: 'start' }}>
          {/* Left column */}
          <div>
            {/* Gallery */}
            <div style={{ background: 'var(--bg-soft)', borderRadius: 18, overflow: 'hidden', marginBottom: 12, aspectRatio: '4/3', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <img
                src={vehicleImageURL(vehicle, { size: 800 })}
                alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                style={{ width: '85%', height: '85%', objectFit: 'contain' }}
              />
              <button
                onClick={() => toggleSave(vehicle.id)}
                style={{
                  position: 'absolute', top: 20, right: 20, width: 48, height: 48, borderRadius: '50%',
                  background: 'white', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                }}
              >
                <Icon name="heart" size={20} style={{ color: isSaved ? 'var(--teal)' : 'var(--muted)', fill: isSaved ? 'var(--teal)' : 'none' }} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 32 }}>
              {[0, 1, 2, 3].map(i => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  style={{
                    background: 'var(--bg-soft)',
                    border: '2px solid ' + (activeImage === i ? 'var(--teal)' : 'transparent'),
                    borderRadius: 10,
                    padding: 8,
                    cursor: 'pointer',
                    aspectRatio: '4/3',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <img src={vehicleImageURL(vehicle, { size: 200 })} alt="" style={{ width: '85%', height: '85%', objectFit: 'contain' }} />
                </button>
              ))}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--line)', marginBottom: 24 }}>
              {([['overview', 'AI Overview'], ['specs', 'Specifications'], ['history', 'Vehicle History'], ['inspection', 'Inspection']] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '14px 20px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    color: tab === key ? 'var(--teal-2)' : 'var(--muted)',
                    borderBottom: '2px solid ' + (tab === key ? 'var(--teal)' : 'transparent'),
                    marginBottom: -1,
                    fontFamily: 'inherit',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {tab === 'overview' && (
              <div>
                <div style={{ background: 'linear-gradient(135deg, rgba(0,124,146,0.06), rgba(90,138,255,0.04))', border: '1px solid var(--line)', borderRadius: 14, padding: '24px 28px', marginBottom: 20 }}>
                  <div className="ai-pill" style={{ marginBottom: 12 }}>
                    <span className="ai-dot" /> Carson AI Overview
                  </div>
                  <p style={{ fontSize: 15, lineHeight: 1.6, margin: 0, color: 'var(--ink)' }}>
                    The {vehicle.year} {vehicle.make} {vehicle.model} is {vehicle.aiSummary.toLowerCase()}. With {fmtMiles(vehicle.mileage)} on the clock and a {vehicle.fuel.toLowerCase()} {vehicle.drive} powertrain, it's well-suited for everyday driving. {isBelowMarket ? `At ${fmtPrice(vehicle.price)}, it's priced ${fmtPrice(savings)} below the typical market range for this vehicle in this condition.` : `At ${fmtPrice(vehicle.price)}, it's priced in line with the current market.`}
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, padding: '22px 24px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--teal-2)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 14 }}>
                      <Icon name="check" size={14} style={{ verticalAlign: '-2px', marginRight: 4 }} /> Pros
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: 'var(--ink)', lineHeight: 1.7 }}>
                      <li>Passed 142-point inspection</li>
                      <li>Low mileage for the year</li>
                      <li>{vehicle.fuel === 'Hybrid' ? 'Excellent fuel economy' : vehicle.fuel === 'Electric' ? 'Zero emissions' : 'Trusted powertrain'}</li>
                      <li>{isBelowMarket ? 'Priced below market' : 'Fair market pricing'}</li>
                    </ul>
                  </div>
                  <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, padding: '22px 24px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#8A5400', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 14 }}>
                      <Icon name="info" size={14} style={{ verticalAlign: '-2px', marginRight: 4 }} /> Things to know
                    </div>
                    <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, color: 'var(--ink)', lineHeight: 1.7 }}>
                      <li>{vehicle.mileage > 30000 ? 'Higher mileage — review service records' : 'Lower mileage may have longer break-in period'}</li>
                      <li>{vehicle.body === 'Truck' ? 'Consider fuel costs for daily commute' : 'Typical of its segment'}</li>
                      <li>Schedule a test drive to confirm fit</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {tab === 'specs' && (
              <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, padding: '8px 0' }}>
                {specs.map((s, i) => (
                  <div key={s.label} style={{ display: 'grid', gridTemplateColumns: '180px 1fr', padding: '14px 24px', borderBottom: i < specs.length - 1 ? '1px solid var(--line)' : 'none' }}>
                    <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>{s.label}</div>
                    <div style={{ fontSize: 14, color: 'var(--ink)' }}>{s.value}</div>
                  </div>
                ))}
              </div>
            )}

            {tab === 'history' && (
              <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, padding: '24px 28px' }}>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {history.map((h, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '32px 1fr', gap: 16, paddingBottom: 20, position: 'relative' }}>
                      <div style={{ position: 'relative' }}>
                        <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--teal)', marginTop: 4 }} />
                        {i < history.length - 1 && <div style={{ position: 'absolute', left: 5, top: 18, bottom: -8, width: 2, background: 'var(--line)' }} />}
                      </div>
                      <div>
                        <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 600, marginBottom: 2 }}>{h.date}</div>
                        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{h.event}</div>
                        <div style={{ fontSize: 13, color: 'var(--muted)' }}>{h.detail}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {tab === 'inspection' && (
              <div>
                <div style={{ background: 'var(--teal-tint)', borderRadius: 14, padding: '20px 24px', marginBottom: 20, display: 'flex', gap: 14, alignItems: 'center' }}>
                  <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
                    <Icon name="shield" size={24} />
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--teal-2)' }}>142/142 Points Passed</div>
                    <div style={{ fontSize: 13, color: 'var(--ink)' }}>This vehicle passed every check in our comprehensive inspection.</div>
                  </div>
                </div>
                <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, padding: '8px 0' }}>
                  {inspectionCategories.map((c, i) => (
                    <div key={c.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: i < inspectionCategories.length - 1 ? '1px solid var(--line)' : 'none' }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <Icon name="check" size={18} style={{ color: 'var(--teal)' }} />
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{c.name}</span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)' }}>{c.score}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column - sticky sidebar */}
          <aside style={{ position: 'sticky', top: 90 }}>
            <div style={{ marginBottom: 4, fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>{vehicle.year}</div>
            <h1 style={{ fontFamily: 'var(--display)', fontSize: 32, fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 14px', lineHeight: 1.1 }}>
              {vehicle.make} {vehicle.model}
            </h1>

            <div style={{ display: 'flex', gap: 14, fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>
              <span><Icon name="gauge" size={13} style={{ verticalAlign: '-2px' }}/> {fmtMiles(vehicle.mileage)}</span>
              <span><Icon name="fuel" size={13} style={{ verticalAlign: '-2px' }}/> {vehicle.fuel}</span>
              <span><Icon name="car" size={13} style={{ verticalAlign: '-2px' }}/> {vehicle.drive}</span>
            </div>

            {/* Price card */}
            <div style={{ background: 'var(--ink)', color: 'white', borderRadius: 16, padding: '24px 28px', marginBottom: 14, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', inset: 0, opacity: 0.4, background: 'radial-gradient(circle at 100% 0%, var(--teal), transparent 60%)' }} />
              <div style={{ position: 'relative' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9ad', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 8 }}>Carson price</div>
                <div style={{ fontFamily: 'var(--display)', fontSize: 42, fontWeight: 600, letterSpacing: '-.02em', lineHeight: 1, marginBottom: 12 }}>
                  {fmtPrice(vehicle.price)}
                </div>
                {isBelowMarket && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(0,200,100,0.2)', color: '#7BFFB0', padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
                    <Icon name="trend" size={12} /> {fmtPrice(savings)} below market
                  </div>
                )}
                <div style={{ fontSize: 12, color: '#9ad' }}>Market: {fmtPrice(marketLow)} – {fmtPrice(marketHigh)}</div>
              </div>
            </div>

            {/* CTAs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              <button onClick={() => setModal('testdrive')} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                <Icon name="car" size={14} /> Book a test drive
              </button>
              <button onClick={() => setModal('otd')} className="btn btn-dark" style={{ width: '100%' }}>
                <Icon name="dollar" size={14} /> Get out-the-door price
              </button>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button onClick={() => setModal('video')} className="btn btn-ghost" style={{ width: '100%' }}>
                  <Icon name="sparkles" size={14} /> Request a video
                </button>
                <button onClick={() => setModal('delivery')} className="btn btn-ghost" style={{ width: '100%' }}>
                  <Icon name="location" size={14} /> Have it delivered
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                <button onClick={() => router.push(`/finance?vehicleId=${vehicle.id}`)} className="btn btn-ghost" style={{ width: '100%' }}>
                  Pre-qualify
                </button>
                <button onClick={() => router.push('/tradein')} className="btn btn-ghost" style={{ width: '100%' }}>
                  Trade-in
                </button>
              </div>
            </div>

            {/* AI Q&A */}
            <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 16, padding: '20px 22px' }}>
              <div className="ai-pill" style={{ marginBottom: 12 }}>
                <span className="ai-dot" /> Ask Carson AI
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {PRESET_QUESTIONS.map(q => (
                  <button
                    key={q}
                    onClick={() => askAI(q)}
                    style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', borderRadius: 999, padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--ink)' }}
                  >
                    {q}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: aiReply || aiThinking ? 14 : 0 }}>
                <input
                  type="text"
                  value={aiQuestion}
                  onChange={e => setAiQuestion(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && askAI()}
                  placeholder="Or type your own question..."
                  className="input"
                  style={{ flex: 1, fontSize: 13 }}
                />
                <button onClick={() => askAI()} disabled={aiThinking || !aiQuestion.trim()} className="btn btn-dark" style={{ padding: '8px 14px' }}>
                  <Icon name="sparkles" size={14} />
                </button>
              </div>
              {aiThinking && (
                <div style={{ fontSize: 13, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Icon name="sparkles" size={14} style={{ color: 'var(--teal)' }} />
                  Thinking<DotsAnim />
                </div>
              )}
              {aiReply && !aiThinking && (
                <div style={{ background: 'var(--bg-soft)', borderRadius: 10, padding: '12px 14px', fontSize: 13.5, lineHeight: 1.55, color: 'var(--ink)' }}>
                  {aiReply}
                </div>
              )}
            </div>

            {/* Included */}
            <div style={{ marginTop: 20, padding: '16px 0', borderTop: '1px solid var(--line)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 12 }}>Included with every Carson</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                {['7-day return policy', '142-point inspection', '30-day powertrain warranty', 'Free CarFax history'].map(item => (
                  <div key={item} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <Icon name="check" size={14} style={{ color: 'var(--teal)' }} /> {item}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>

        {/* Similar vehicles */}
        {similar.length > 0 && (
          <div style={{ marginTop: 80 }}>
            <h2 style={{ fontFamily: 'var(--display)', fontSize: 28, fontWeight: 600, letterSpacing: '-.02em', marginBottom: 24 }}>Similar vehicles</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
              {similar.map(v => <VehicleCard key={v.id} vehicle={v} />)}
            </div>
          </div>
        )}
      </div>

      {/* ── BOOK TEST DRIVE ── */}
      <Modal open={modal === 'testdrive'} onClose={() => setModal(null)} title="Book a test drive">
        {submitted ? (
          <div style={{ textAlign: 'center', padding: '20px 0 8px' }}>
            <div style={{ width: 52, height: 52, margin: '0 auto 16px', borderRadius: '50%', background: 'var(--teal-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={26} style={{ color: 'var(--teal-2)' }} />
            </div>
            <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>You're booked!</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>We'll text you a confirmation shortly.</div>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 18px', lineHeight: 1.5 }}>
              Take the {vehicle.year} {vehicle.make} {vehicle.model} for a spin. We'll have it ready when you arrive — no waiting.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6, letterSpacing: '.02em' }}>Pick a day</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {Array.from({ length: 4 }, (_, i) => {
                    const d = new Date();
                    d.setDate(d.getDate() + i + 1);
                    const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                    return (
                      <button key={i} onClick={() => setTdDate(label)} style={{
                        padding: '10px 6px', borderRadius: 10,
                        background: tdDate === label ? 'var(--ink)' : 'white',
                        color: tdDate === label ? 'white' : 'var(--ink)',
                        border: '1px solid ' + (tdDate === label ? 'var(--ink)' : 'var(--line)'),
                        cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
                      }}>{label}</button>
                    );
                  })}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6, letterSpacing: '.02em' }}>Pick a time</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {['10 AM', '12 PM', '2 PM', '4 PM', '5 PM', '6 PM'].map(t => (
                    <button key={t} onClick={() => setTdTime(t)} style={{
                      padding: '10px 6px', borderRadius: 10,
                      background: tdTime === t ? 'var(--ink)' : 'white',
                      color: tdTime === t ? 'white' : 'var(--ink)',
                      border: '1px solid ' + (tdTime === t ? 'var(--ink)' : 'var(--line)'),
                      cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
                    }}>{t}</button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <input className="input" placeholder="Your name" value={tdName} onChange={e => setTdName(e.target.value)} />
                <input className="input" placeholder="Phone" value={tdPhone} onChange={e => setTdPhone(e.target.value)} />
              </div>
              <button onClick={finishModal} disabled={!tdDate || !tdTime || !tdName || !tdPhone} className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 4 }}>
                Confirm booking
              </button>
              <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
                <Icon name="shield" size={10} style={{ verticalAlign: '-1px' }} /> No pressure. Cancel anytime.
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── REQUEST VIDEO ── */}
      <Modal open={modal === 'video'} onClose={() => setModal(null)} title="Request a personalized video">
        {submitted ? (
          <div style={{ textAlign: 'center', padding: '20px 0 8px' }}>
            <div style={{ width: 52, height: 52, margin: '0 auto 16px', borderRadius: '50%', background: 'var(--teal-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={26} style={{ color: 'var(--teal-2)' }} />
            </div>
            <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>Request received!</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>We'll send your custom video within 2 hours.</div>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 18px', lineHeight: 1.5 }}>
              One of our team will record a 2-3 minute walkaround of <strong style={{ color: 'var(--ink)' }}>this exact vehicle</strong>. Tell us what to show.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 8, letterSpacing: '.02em' }}>What should we focus on? (pick any)</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {['Exterior', 'Interior', 'Engine bay', 'Trunk space', 'Tech features', 'Undercarriage', 'Tire condition', 'Any wear/damage'].map(opt => {
                    const active = videoFocus.includes(opt);
                    return (
                      <button key={opt} onClick={() => setVideoFocus(f => active ? f.filter(x => x !== opt) : [...f, opt])} style={{
                        padding: '7px 12px', borderRadius: 999,
                        background: active ? 'var(--ink)' : 'white',
                        color: active ? 'white' : 'var(--ink)',
                        border: '1px solid ' + (active ? 'var(--ink)' : 'var(--line)'),
                        cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
                      }}>{opt}</button>
                    );
                  })}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6, letterSpacing: '.02em' }}>Anything specific to ask?</div>
                <textarea
                  className="input"
                  value={videoNotes}
                  onChange={e => setVideoNotes(e.target.value)}
                  placeholder="e.g., Show me how the cargo space looks with the second row folded down"
                  style={{ minHeight: 80, fontFamily: 'inherit', resize: 'none' }}
                />
              </div>
              <input className="input" type="email" placeholder="Your email" value={videoEmail} onChange={e => setVideoEmail(e.target.value)} />
              <button onClick={finishModal} disabled={!videoEmail || videoFocus.length === 0} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                Send my video request
              </button>
              <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
                <Icon name="check" size={10} style={{ verticalAlign: '-1px' }} /> Typical turnaround: under 2 hours.
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── HAVE IT DELIVERED ── */}
      <Modal open={modal === 'delivery'} onClose={() => setModal(null)} title="Have it delivered to you">
        {submitted ? (
          <div style={{ textAlign: 'center', padding: '20px 0 8px' }}>
            <div style={{ width: 52, height: 52, margin: '0 auto 16px', borderRadius: '50%', background: 'var(--teal-tint)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={26} style={{ color: 'var(--teal-2)' }} />
            </div>
            <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>Delivery info saved</div>
            <div style={{ fontSize: 13, color: 'var(--muted)' }}>A specialist will reach out to finalize the details.</div>
          </div>
        ) : (
          <div>
            <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 18px', lineHeight: 1.5 }}>
              We'll bring this {vehicle.make} {vehicle.model} right to your driveway. Free within 100 miles of San Diego — flat-rate beyond.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6, letterSpacing: '.02em' }}>Delivery ZIP</div>
                <input
                  className="input"
                  placeholder="e.g., 90210"
                  value={deliveryZip}
                  onChange={e => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 5);
                    setDeliveryZip(v);
                    if (v.length === 5) {
                      const d = 20 + (parseInt(v.slice(0, 3), 10) % 250);
                      setDeliveryDistance(d);
                    } else {
                      setDeliveryDistance(null);
                    }
                  }}
                />
              </div>

              {deliveryDistance !== null && (
                <div style={{ background: 'var(--bg-soft)', borderRadius: 12, padding: '16px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>Distance from Carson</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{deliveryDistance} mi</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>Estimated arrival</span>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{deliveryDistance < 100 ? '1–2 days' : '3–5 days'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid var(--line)' }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>Delivery fee</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: deliveryDistance <= 100 ? 'var(--teal-2)' : 'var(--ink)' }}>
                      {deliveryDistance <= 100 ? 'FREE' : fmtPrice(199 + Math.round((deliveryDistance - 100) * 1.4))}
                    </span>
                  </div>
                </div>
              )}

              <button onClick={finishModal} disabled={deliveryDistance === null} className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                Continue with delivery
              </button>
              <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
                <Icon name="check" size={10} style={{ verticalAlign: '-1px' }} /> 7-day return still applies — even if it's delivered.
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── OUT THE DOOR PRICE ── */}
      <Modal open={modal === 'otd'} onClose={() => setModal(null)} title="Your out-the-door price" width={560}>
        {(() => {
          const taxRates: Record<string, number> = { CA: 0.0775, TX: 0.0625, NY: 0.0875, FL: 0.06, AZ: 0.056, NV: 0.0685, OR: 0.0 };
          const taxRate = taxRates[otdState] ?? 0.07;
          const tax = Math.round(vehicle.price * taxRate);
          const docFee = 85;
          const titleReg = 320;
          const inspection = 0;
          const total = vehicle.price + tax + docFee + titleReg + inspection;

          return (
            <div>
              <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 18px', lineHeight: 1.5 }}>
                Real numbers — nothing hidden. Pick your state and we'll show you the all-in price.
              </p>
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', marginBottom: 6, letterSpacing: '.02em' }}>Registration state</div>
                <select className="select" value={otdState} onChange={e => setOtdState(e.target.value)}>
                  <option value="CA">California (7.75%)</option>
                  <option value="TX">Texas (6.25%)</option>
                  <option value="NY">New York (8.75%)</option>
                  <option value="FL">Florida (6.00%)</option>
                  <option value="AZ">Arizona (5.60%)</option>
                  <option value="NV">Nevada (6.85%)</option>
                  <option value="OR">Oregon (0.00%)</option>
                </select>
              </div>

              <div style={{ background: 'var(--bg-soft)', borderRadius: 14, padding: '20px 22px', marginBottom: 16 }}>
                {[
                  { label: 'Vehicle price', value: fmtPrice(vehicle.price) },
                  { label: `Sales tax (${(taxRate * 100).toFixed(2)}%)`, value: fmtPrice(tax) },
                  { label: 'Title & registration', value: fmtPrice(titleReg) },
                  { label: 'Documentation fee', value: fmtPrice(docFee) },
                  { label: 'Pre-delivery inspection', value: 'FREE', highlight: true },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: 14 }}>
                    <span style={{ color: 'var(--muted)' }}>{row.label}</span>
                    <span style={{ fontWeight: 600, color: row.highlight ? 'var(--teal-2)' : 'var(--ink)' }}>{row.value}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 14, marginTop: 8, borderTop: '1px solid var(--line)' }}>
                  <span style={{ fontSize: 15, fontWeight: 700 }}>Out-the-door total</span>
                  <span style={{ fontFamily: 'var(--display)', fontSize: 26, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--ink)' }}>{fmtPrice(total)}</span>
                </div>
              </div>

              <div style={{ background: 'var(--teal-tint)', borderRadius: 12, padding: '14px 16px', fontSize: 13, color: 'var(--teal-2)', display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 16 }}>
                <Icon name="check" size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <span><strong>No surprise fees.</strong> What you see is what you pay. Trade-in credit and any financing terms applied separately.</span>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => router.push(`/finance?vehicleId=${vehicle.id}`)} className="btn btn-primary" style={{ flex: 1 }}>
                  Finance this car
                </button>
                <button onClick={() => setModal('testdrive')} className="btn btn-dark" style={{ flex: 1 }}>
                  Book test drive
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ── STICKY MOBILE CTA BAR ── */}
      <div className="vdp-mobile-cta">
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 700, lineHeight: 1 }}>
            {fmtPrice(vehicle.price)}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>or est. ${estMonthly(vehicle.price)}/mo</div>
        </div>
        <button onClick={() => setModal('otd')} className="btn btn-ghost btn-sm">
          Price
        </button>
        <button onClick={() => setModal('testdrive')} className="btn btn-primary">
          <Icon name="car" size={14} /> Test drive
        </button>
      </div>
    </div>
  );
}
