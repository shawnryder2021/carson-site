'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { VehicleCard } from '@/components/VehicleCard';
import { HeroMedia } from '@/components/HeroMedia';
import { INVENTORY } from '@/data/inventory';
import { useHeroConfig } from '@/context/HeroConfigContext';

export default function Home() {
  const router = useRouter();
  const { hero } = useHeroConfig();
  const [query, setQuery] = useState('');

  const search = () => {
    if (query) router.push(`/inventory?aiQuery=${encodeURIComponent(query)}`);
  };

  const featured = INVENTORY.slice(0, 8);

  return (
    <div className="page fade-in">
      {/* Hero */}
      <section style={{ padding: '80px 0 120px', background: 'linear-gradient(135deg, rgba(0,124,146,0.05), rgba(90,138,255,0.05))' }}>
        <div className="container" style={{ maxWidth: 1100 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(40px, 6vw, 68px)', fontWeight: 700, letterSpacing: '-.02em', margin: '0 0 16px', lineHeight: 1.1 }}>
              {hero.headline}
            </h1>
            <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: 'var(--muted)', margin: 0 }}>
              {hero.subtext}
            </p>
          </div>

          {/* Hero media (video or image) */}
          <div style={{ maxWidth: 960, margin: '0 auto 36px' }}>
            <HeroMedia hero={hero} />
          </div>

          {/* Search Bar */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 32 }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: 600 }}>
              <div className="ai-glow" style={{ borderRadius: 16 }}>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && search()}
                  placeholder="e.g., 'Under $30k, great on gas' or 'SUV for a family with kids'"
                  style={{ width: '100%', padding: '14px 18px', border: '1px solid var(--line)', borderRadius: 16, fontSize: 14, fontFamily: 'inherit' }}
                />
              </div>
            </div>
            <button onClick={search} className="btn btn-primary btn-lg">
              <Icon name="sparkles" size={16} /> Search
            </button>
          </div>

          {/* Quick suggestions */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 40 }}>
            {['SUV under $30k', 'Family-friendly with low miles', 'Best on gas for a long commute', 'Sporty coupe under $50k'].map(s => (
              <button key={s} onClick={() => router.push(`/inventory?aiQuery=${encodeURIComponent(s)}`)} style={{
                background: 'white', border: '1px solid var(--line)', borderRadius: 999, padding: '8px 14px',
                fontSize: 13, fontFamily: 'inherit', color: 'var(--ink)', cursor: 'pointer',
              }}>
                <Icon name="sparkles" size={12} style={{ color: 'var(--teal)', verticalAlign: '-1px', marginRight: 4 }} />{s}
              </button>
            ))}
          </div>

          {/* Featured Car Hero */}
          <div
            onClick={() => router.push(`/vehicle/${featured[0].id}`)}
            style={{
              background: 'white', border: '1px solid var(--line)', borderRadius: 22,
              padding: 32, maxWidth: 900, margin: '0 auto',
              display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 32, alignItems: 'center',
              cursor: 'pointer', transition: 'transform 200ms, box-shadow 200ms',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(0,0,0,0.08)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ background: 'var(--bg-soft)', borderRadius: 16, aspectRatio: '4/3', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
              <img src={`data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M25,85 Q10,50 25,30 Q50,20 75,30 Q90,50 75,85 Z' fill='%23007C92' opacity='0.85'/%3E%3C/svg%3E`} alt="" style={{ width: '80%', height: '80%' }} />
              <div style={{ position: 'absolute', top: 14, left: 14, background: 'var(--teal)', color: 'white', padding: '5px 11px', borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: '.04em' }}>
                <Icon name="sparkles" size={11} style={{ verticalAlign: '-1px', marginRight: 4 }}/>AI'S TOP PICK TODAY
              </div>
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>{featured[0].year}</div>
              <h2 style={{ fontFamily: 'var(--display)', fontSize: 32, fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 12px', lineHeight: 1.1 }}>
                {featured[0].make} {featured[0].model}
              </h2>
              <div style={{ display: 'flex', gap: 14, fontSize: 13, color: 'var(--muted)', marginBottom: 18 }}>
                <span><Icon name="gauge" size={13} style={{ verticalAlign: '-2px' }}/> {featured[0].mileage.toLocaleString()} mi</span>
                <span><Icon name="fuel" size={13} style={{ verticalAlign: '-2px' }}/> {featured[0].fuel}</span>
                <span><Icon name="car" size={13} style={{ verticalAlign: '-2px' }}/> {featured[0].drive}</span>
              </div>
              <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.55, margin: '0 0 18px' }}>
                {featured[0].aiSummary}. Carson AI picked this as today's best value for first-time buyers.
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 18 }}>
                <span style={{ fontFamily: 'var(--display)', fontSize: 32, fontWeight: 700, color: 'var(--ink)' }}>${featured[0].price.toLocaleString()}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(0,180,80,0.12)', color: '#0F6B2D', padding: '3px 9px', borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                  <Icon name="trend" size={11}/> Below market
                </span>
              </div>
              <button className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                View this vehicle <Icon name="arrowRight" size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Inventory */}
      <section style={{ padding: '80px 0' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: 36, fontWeight: 600, textAlign: 'center', marginBottom: 48, letterSpacing: '-.02em' }}>
            Browse our inventory
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 24 }}>
            {featured.map(v => (
              <VehicleCard key={v.id} vehicle={v} />
            ))}
          </div>
        </div>
      </section>

      {/* Why Carson */}
      <section style={{ padding: '80px 0', background: 'var(--bg-soft)' }}>
        <div className="container" style={{ maxWidth: 1200 }}>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: 36, fontWeight: 600, textAlign: 'center', marginBottom: 48, letterSpacing: '-.02em' }}>
            Why choose Carson
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
            {[
              { icon: 'sparkles', title: 'AI-Powered', desc: 'Carson AI answers your questions 24/7' },
              { icon: 'check', title: 'Honest Pricing', desc: 'Live market data on every car' },
              { icon: 'award', title: 'Quality Guaranteed', desc: '142-point inspection on every vehicle' },
            ].map(f => (
              <div key={f.title} style={{ background: 'white', borderRadius: 16, padding: 32, textAlign: 'center' }}>
                <Icon name={f.icon as any} size={32} style={{ color: 'var(--teal)', marginBottom: 16 }} />
                <h3 style={{ fontWeight: 600, marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '60px 0', background: 'linear-gradient(135deg, var(--teal), #5a8aff)', color: 'white', textAlign: 'center' }}>
        <div className="container">
          <h2 style={{ fontFamily: 'var(--display)', fontSize: 40, fontWeight: 600, marginBottom: 16 }}>Ready?</h2>
          <p style={{ fontSize: 18, marginBottom: 24, opacity: 0.9 }}>Let's find your perfect car.</p>
          <button onClick={() => router.push('/finder')} className="btn btn-dark btn-lg">
            <Icon name="sparkles" size={16} /> Take the Carson AI Finder
          </button>
        </div>
      </section>
    </div>
  );
}
