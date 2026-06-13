'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { fmtPrice, fmtMiles } from '@/lib/format';
import { vehicleImageURL } from '@/data/vehicleImage';
import { createCarRequest, createLead, listVehicles, isSupabaseConfigured, AdminVehicle } from '@/lib/db';
import { matchesRequest, describeRequest, CarRequest } from '@/lib/carMatch';

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
              transition: 'all .15s',
            }}
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

function StepBadge({ n }: { n: number }) {
  return (
    <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--ink)', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, marginRight: 10, flexShrink: 0 }}>
      {n}
    </span>
  );
}

export default function CarFinderPage() {
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inventory, setInventory] = useState<AdminVehicle[]>([]);

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

  useEffect(() => {
    listVehicles().then(setInventory);
  }, []);

  const criteriaRequest: CarRequest = useMemo(() => ({
    name: '', email: '', phone: '', contactPref: 'email',
    body, make: make.trim(), model: model.trim(),
    yearMin: yearMin ? parseInt(yearMin) : null,
    priceMax: priceMax ? parseInt(priceMax) : null,
    mileageMax: mileageMax ? parseInt(mileageMax) : null,
    fuel, drive, notes: '', active: true, notifiedVehicleIds: [],
  }), [body, make, model, yearMin, priceMax, mileageMax, fuel, drive]);

  const hasCriteria = !!(body || make.trim() || model.trim() || yearMin || priceMax || mileageMax || fuel || drive);
  const liveMatches = useMemo(
    () => (hasCriteria ? inventory.filter(v => matchesRequest(v as any, criteriaRequest)) : []),
    [inventory, criteriaRequest, hasCriteria]
  );

  const submit = async () => {
    setError(null);
    if (!name.trim()) return setError('Please tell us your name.');
    if (!email.trim() && !phone.trim()) return setError('Please give us an email or phone number so we can reach you.');
    if (contactPref === 'sms' && !phone.trim()) return setError('Add a phone number to receive text alerts.');
    if (contactPref === 'email' && !email.trim()) return setError('Add an email address to receive email alerts.');
    if (!hasCriteria) return setError('Tell us at least one thing about the car you want (type, make, model, or budget).');

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
      window.scrollTo({ top: 0 });
    } else {
      setError(isSupabaseConfigured ? err : 'CarFinder requires the database connection — please call or email us instead.');
    }
    setBusy(false);
  };

  if (submitted) {
    return (
      <div className="page fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '70vh', padding: '40px 20px' }}>
        <div style={{ textAlign: 'center', maxWidth: 520 }}>
          <div style={{ fontSize: 56, marginBottom: 8 }}>🎯</div>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 34, fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 8px' }}>You&apos;re on the list.</h1>
          <div className="ai-pill" style={{ marginBottom: 18 }}>
            <span className="ai-dot" /> Now watching: {describeRequest(criteriaRequest)}
          </div>
          <div style={{ textAlign: 'left', background: 'var(--bg-soft)', border: '1px solid var(--line)', borderRadius: 14, padding: '18px 22px', marginBottom: 22 }}>
            {[
              { icon: '👀', text: 'Every vehicle that lands on our lot gets checked against your request — automatically.' },
              { icon: contactPref === 'sms' ? '💬' : '✉️', text: `The moment one matches, you get ${contactPref === 'sms' ? 'a text' : 'an email'} — often before it's advertised anywhere else.` },
              { icon: '🤝', text: 'No spam, ever. You only hear from us when your car shows up.' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '8px 0' }}>
                <span style={{ fontSize: 20 }}>{s.icon}</span>
                <span style={{ fontSize: 14, lineHeight: 1.55 }}>{s.text}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => router.push('/inventory')}>Browse current inventory</button>
            <button className="btn btn-ghost" onClick={() => setSubmitted(false)}>Submit another request</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page fade-in">
      {/* Hero */}
      <div style={{ background: 'var(--ink)', color: 'white', padding: '64px 24px 56px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.5, background: 'radial-gradient(ellipse at 20% 0%, rgba(0,124,146,.6), transparent 55%), radial-gradient(ellipse at 90% 100%, rgba(90,138,255,.4), transparent 55%)' }} />
        <div style={{ maxWidth: 720, margin: '0 auto', position: 'relative' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.2)', borderRadius: 20, padding: '6px 14px', fontSize: 12.5, fontWeight: 700, marginBottom: 18 }}>
            <span className="ai-dot" style={{ background: '#7BFFB0' }} /> LIVE — watching every new arrival
          </div>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(32px,5vw,48px)', fontWeight: 600, letterSpacing: '-.02em', lineHeight: 1.05, margin: '0 0 14px' }}>
            Your dream car isn&apos;t here <em style={{ fontFamily: 'var(--serif)', fontStyle: 'italic' }}>yet.</em><br />Be first when it is.
          </h1>
          <p style={{ fontSize: 16.5, opacity: 0.85, margin: '0 auto', lineHeight: 1.6, maxWidth: 560 }}>
            New vehicles hit our lot every week. Describe the one you want and our system watches around the clock — you get first dibs the second it arrives.
          </p>
        </div>
      </div>

      {/* How it works */}
      <div style={{ background: 'var(--bg-soft)', borderBottom: '1px solid var(--line)', padding: '18px 20px' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          {[
            { icon: 'edit', t: 'Describe your car', d: '30 seconds, no account needed' },
            { icon: 'search', t: 'We watch the lot 24/7', d: 'Every arrival checked instantly' },
            { icon: 'sparkles', t: 'You get first dibs', d: 'Text or email before it’s advertised' },
          ].map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--teal-tint)', color: 'var(--teal-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name={s.icon as any} size={17} />
              </div>
              <div>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{s.t}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{s.d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="container" style={{ maxWidth: 660, padding: '40px 20px 60px' }}>
        <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 16, padding: '30px 36px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', fontFamily: 'var(--display)', fontSize: 20, fontWeight: 600, margin: '0 0 20px' }}>
            <StepBadge n={1} /> The car you want
          </h3>
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
            <div className="rg" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
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

          {/* Live inventory matches */}
          {hasCriteria && (
            <div style={{ marginTop: 24, borderRadius: 14, overflow: 'hidden', border: '1px solid ' + (liveMatches.length ? 'var(--teal)' : 'var(--line)'), transition: 'border-color .2s' }}>
              <div style={{ background: liveMatches.length ? 'var(--teal-tint)' : 'var(--bg-soft)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="ai-dot" />
                <span style={{ fontSize: 13.5, fontWeight: 800, color: liveMatches.length ? 'var(--teal-2)' : 'var(--muted)' }}>
                  {liveMatches.length > 0
                    ? `🎯 ${liveMatches.length} car${liveMatches.length === 1 ? '' : 's'} on our lot match${liveMatches.length === 1 ? 'es' : ''} this right now`
                    : 'No matches in stock yet — exactly why alerts exist. New stock lands every week.'}
                </span>
              </div>
              {liveMatches.slice(0, 3).map(v => (
                <div
                  key={v.id}
                  onClick={() => router.push(`/vehicle/${v.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', borderTop: '1px solid var(--line)', cursor: 'pointer', background: 'white' }}
                >
                  <span style={{ width: 64, height: 44, borderRadius: 8, overflow: 'hidden', background: 'var(--bg-soft)', flexShrink: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={(v as any).images?.[0] || vehicleImageURL(v, { size: 128 })} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.year} {v.make} {v.model}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{fmtMiles(v.mileage)} · {v.fuel} · {v.drive}</div>
                  </div>
                  <div style={{ fontFamily: 'var(--display)', fontSize: 17, fontWeight: 700, color: 'var(--teal-2)', whiteSpace: 'nowrap' }}>{fmtPrice(v.price)}</div>
                  <Icon name="arrowRight" size={15} style={{ color: 'var(--muted)', flexShrink: 0 }} />
                </div>
              ))}
              {liveMatches.length > 3 && (
                <button
                  onClick={() => router.push('/inventory')}
                  style={{ width: '100%', padding: '10px', background: 'white', border: 'none', borderTop: '1px solid var(--line)', fontSize: 13, fontWeight: 700, color: 'var(--teal-2)', cursor: 'pointer' }}
                >
                  See all {liveMatches.length} matches in inventory →
                </button>
              )}
            </div>
          )}

          <h3 style={{ display: 'flex', alignItems: 'center', fontFamily: 'var(--display)', fontSize: 20, fontWeight: 600, margin: '30px 0 20px' }}>
            <StepBadge n={2} /> How to reach you
          </h3>
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
              <div style={{ display: 'flex', gap: 8 }}>
                {([['email', '✉️ Email'], ['sms', '💬 Text message']] as const).map(([v, t]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setContactPref(v)}
                    style={{
                      padding: '10px 16px', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 13.5,
                      background: contactPref === v ? 'var(--teal)' : 'var(--bg-soft)',
                      color: contactPref === v ? 'white' : 'var(--ink)',
                      border: '1px solid ' + (contactPref === v ? 'var(--teal)' : 'var(--line)'),
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
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
