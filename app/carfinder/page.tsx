'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { createCarRequest, createLead, isSupabaseConfigured } from '@/lib/db';

const BODY_TYPES = ['Any', 'SUV', 'Sedan', 'Truck', 'Coupe', 'Wagon', 'Hatchback'];
const FUEL_TYPES = ['Any', 'Gas', 'Hybrid', 'Electric'];
const DRIVE_TYPES = ['Any', 'FWD', 'RWD', 'AWD'];

const label: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)',
  marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.05em',
};

function Chips({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {options.map(o => {
        const selected = value === o || (o === 'Any' && !value);
        return (
          <button
            key={o}
            type="button"
            onClick={() => onChange(o === 'Any' ? '' : o)}
            style={{
              padding: '9px 14px', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13,
              background: selected ? 'var(--teal)' : 'var(--bg-soft)',
              color: selected ? 'white' : 'var(--ink)',
              border: '1px solid ' + (selected ? 'var(--teal)' : 'var(--line)'),
            }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

export default function CarFinderPage() {
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Criteria
  const [body, setBody] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [yearMin, setYearMin] = useState('');
  const [priceMax, setPriceMax] = useState('');
  const [mileageMax, setMileageMax] = useState('');
  const [fuel, setFuel] = useState('');
  const [drive, setDrive] = useState('');
  const [notes, setNotes] = useState('');

  // Contact
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [contactPref, setContactPref] = useState<'email' | 'sms'>('email');

  const submit = async () => {
    setError(null);
    if (!name.trim()) return setError('Please tell us your name.');
    if (!email.trim() && !phone.trim()) return setError('Please give us an email or phone number so we can reach you.');
    if (contactPref === 'sms' && !phone.trim()) return setError('Add a phone number to receive text alerts.');
    if (contactPref === 'email' && !email.trim()) return setError('Add an email address to receive email alerts.');
    if (!body && !make && !model && !priceMax) return setError('Tell us at least one thing about the car you want (type, make, model, or budget).');

    setBusy(true);
    const criteria = {
      body, make: make.trim(), model: model.trim(),
      yearMin: yearMin ? parseInt(yearMin) : null,
      priceMax: priceMax ? parseInt(priceMax) : null,
      mileageMax: mileageMax ? parseInt(mileageMax) : null,
      fuel, drive, notes: notes.trim(),
    };
    const { error: err } = await createCarRequest({
      name: name.trim(), email: email.trim(), phone: phone.trim(), contactPref, ...criteria,
    });
    // Also drop it in the leads inbox so the team sees it right away.
    if (!err) {
      await createLead({
        type: 'carfinder', name: name.trim(), email: email.trim(), phone: phone.trim(),
        payload: { ...criteria, contactPref },
      });
      setSubmitted(true);
    } else {
      setError(isSupabaseConfigured ? err : 'CarFinder requires the database connection — please call or email us instead.');
    }
    setBusy(false);
  };

  if (submitted) {
    return (
      <div className="page fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', maxWidth: 480, padding: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--teal)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
            <Icon name="check" size={28} />
          </div>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 30, fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 10px' }}>We&apos;re on the lookout. 👀</h1>
          <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.6, margin: '0 0 22px' }}>
            Your request is saved. The moment a matching vehicle hits our lot, you&apos;ll get
            {contactPref === 'sms' ? ' a text' : ' an email'} — usually before it&apos;s even listed everywhere else.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={() => router.push('/inventory')}>Browse current inventory</button>
            <button className="btn btn-ghost" onClick={() => { setSubmitted(false); }}>Submit another request</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page fade-in">
      <div style={{ background: 'linear-gradient(135deg, var(--teal), #5a8aff)', color: 'white', padding: '60px 40px', textAlign: 'center', marginBottom: 40 }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ fontSize: 14, fontWeight: 700, opacity: 0.9, marginBottom: 12, letterSpacing: '.05em', textTransform: 'uppercase' }}>
            <Icon name="search" size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />Carson CarFinder
          </div>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 40, fontWeight: 600, letterSpacing: '-.02em', lineHeight: 1.1, margin: '0 0 12px' }}>
            Don&apos;t see your car? We&apos;ll watch for it.
          </h1>
          <p style={{ fontSize: 16, opacity: 0.95, margin: 0, lineHeight: 1.6 }}>
            Tell us exactly what you&apos;re looking for. New vehicles arrive every day — the second one matches, we&apos;ll text or email you automatically.
          </p>
        </div>
      </div>

      <div className="container" style={{ maxWidth: 640, paddingBottom: 60 }}>
        <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 16, padding: '30px 36px' }}>
          <h3 style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 600, margin: '0 0 20px' }}>1. The car you want</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={label}>Vehicle type</label>
              <Chips options={BODY_TYPES} value={body} onChange={setBody} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={label}>Make</label>
                <input className="input" value={make} onChange={e => setMake(e.target.value)} placeholder="e.g. Toyota" />
              </div>
              <div>
                <label style={label}>Model</label>
                <input className="input" value={model} onChange={e => setModel(e.target.value)} placeholder="e.g. RAV4" />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              <div>
                <label style={label}>Year (newest from)</label>
                <input className="input" type="number" value={yearMin} onChange={e => setYearMin(e.target.value)} placeholder="2019" />
              </div>
              <div>
                <label style={label}>Max budget ($)</label>
                <input className="input" type="number" value={priceMax} onChange={e => setPriceMax(e.target.value)} placeholder="30000" />
              </div>
              <div>
                <label style={label}>Max km</label>
                <input className="input" type="number" value={mileageMax} onChange={e => setMileageMax(e.target.value)} placeholder="100000" />
              </div>
            </div>
            <div>
              <label style={label}>Fuel</label>
              <Chips options={FUEL_TYPES} value={fuel} onChange={setFuel} />
            </div>
            <div>
              <label style={label}>Drivetrain</label>
              <Chips options={DRIVE_TYPES} value={drive} onChange={setDrive} />
            </div>
            <div>
              <label style={label}>Anything else we should know? (optional)</label>
              <textarea className="input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Must have a tow package, prefer lighter colours…" style={{ minHeight: 70, fontFamily: 'inherit', resize: 'vertical' }} />
            </div>
          </div>

          <h3 style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 600, margin: '30px 0 20px' }}>2. How to reach you</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={label}>Your name *</label>
              <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="First and last name" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={label}>Email</label>
                <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <div>
                <label style={label}>Phone</label>
                <input className="input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(902) 555-1234" />
              </div>
            </div>
            <div>
              <label style={label}>Alert me by</label>
              <Chips options={['email', 'sms']} value={contactPref} onChange={v => setContactPref((v || 'email') as 'email' | 'sms')} />
            </div>
          </div>

          {error && (
            <div style={{ background: '#FDECEC', color: '#A8232C', borderRadius: 10, padding: '12px 14px', fontSize: 13.5, marginTop: 20 }}>
              {error}
            </div>
          )}

          <button onClick={submit} disabled={busy} className="btn btn-primary btn-lg" style={{ width: '100%', marginTop: 24 }}>
            <Icon name="search" size={15} /> {busy ? 'Saving…' : 'Start watching for my car'}
          </button>
          <div style={{ fontSize: 12, color: 'var(--muted)', textAlign: 'center', marginTop: 12 }}>
            No spam — you only hear from us when a matching vehicle arrives. Unsubscribe anytime by replying.
          </div>
        </div>
      </div>
    </div>
  );
}
