'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Icon } from '@/components/Icon';
import { VehicleCard } from '@/components/VehicleCard';
import { HeroMedia } from '@/components/HeroMedia';
import { INVENTORY } from '@/data/inventory';
import { DEFAULT_HERO, HeroConfig } from '@/data/heroConfig';
import { vehicleImageURL } from '@/data/vehicleImage';
import { fmtPrice, fmtMiles } from '@/lib/format';
import { listVehicles, getSettings, getDealVehicleId, AdminVehicle } from '@/lib/db';

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [hero, setHero] = useState<HeroConfig>(DEFAULT_HERO);
  const [vehicles, setVehicles] = useState<AdminVehicle[]>(INVENTORY as AdminVehicle[]);
  const [dealId, setDealId] = useState('');

  useEffect(() => {
    (async () => {
      const [s, v, d] = await Promise.all([getSettings(), listVehicles(), getDealVehicleId()]);
      setHero(s);
      if (v.length) setVehicles(v);
      setDealId(d);
    })();
  }, []);

  const search = () => {
    if (query) router.push(`/inventory?aiQuery=${encodeURIComponent(query)}`);
  };

  // Banner mode: clickable hero when the overlay is off and a link is set.
  const heroClickable = !hero.showOverlay && !!hero.linkUrl;
  const goToHeroLink = () => {
    const url = hero.linkUrl.trim();
    if (!url) return;
    if (/^https?:\/\//i.test(url)) window.open(url, '_blank', 'noopener');
    else router.push(url);
  };

  const available = vehicles.filter(v => v.status !== 'sold');
  const featured = available.slice(0, 8);
  const deal = dealId ? available.find(v => v.id === dealId) : undefined;
  const recentlySold = vehicles.filter(v => v.status === 'sold').slice(0, 4);

  return (
    <div className="page fade-in">
      {/* Hero — full-bleed background video/image. Optional overlay + banner link. */}
      <section
        onClick={heroClickable ? goToHeroLink : undefined}
        style={{
          position: 'relative',
          margin: '0 -20px',
          minHeight: 'min(82vh, 680px)',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          background: 'var(--ink)',
          cursor: heroClickable ? 'pointer' : 'default',
        }}
      >
        {/* Background media */}
        <HeroMedia hero={hero} variant="cover" />

        {/* Scrim — only when the text overlay is shown */}
        {hero.showOverlay && (
          <div aria-hidden style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to bottom, rgba(8,12,18,0.55) 0%, rgba(8,12,18,0.35) 45%, rgba(8,12,18,0.75) 100%)',
          }} />
        )}

        {/* Overlaid content */}
        {hero.showOverlay && (
          <div className="container" style={{ position: 'relative', maxWidth: 900, width: '100%', textAlign: 'center', color: 'white', padding: '72px 20px' }}>
            <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(40px, 6.5vw, 76px)', fontWeight: 700, letterSpacing: '-.02em', margin: '0 0 16px', lineHeight: 1.05, textShadow: '0 2px 24px rgba(0,0,0,0.35)' }}>
              {hero.headline}
            </h1>
            <p style={{ fontSize: 'clamp(16px, 2vw, 21px)', color: 'rgba(255,255,255,0.92)', margin: '0 auto 36px', maxWidth: 620, textShadow: '0 1px 12px rgba(0,0,0,0.4)' }}>
              {hero.subtext}
            </p>

            {/* Search Bar */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', width: '100%', maxWidth: 560 }}>
                <div className="ai-glow" style={{ borderRadius: 16 }}>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && search()}
                    placeholder="e.g., 'Under $30k, great on gas' or 'SUV for a family'"
                    style={{ width: '100%', padding: '15px 18px', border: 'none', borderRadius: 16, fontSize: 15, fontFamily: 'inherit', boxShadow: '0 8px 30px rgba(0,0,0,0.25)' }}
                  />
                </div>
              </div>
              <button onClick={search} className="btn btn-primary btn-lg" style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.25)' }}>
                <Icon name="sparkles" size={16} /> Search
              </button>
            </div>

            {/* Quick suggestions */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {['SUV under $30k', 'Family-friendly with low miles', 'Best on gas for a long commute', 'Sporty coupe under $50k'].map(s => (
                <button key={s} onClick={() => router.push(`/inventory?aiQuery=${encodeURIComponent(s)}`)} style={{
                  background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.25)',
                  borderRadius: 999, padding: '8px 14px', fontSize: 13, fontFamily: 'inherit', color: 'white', cursor: 'pointer',
                }}>
                  <Icon name="sparkles" size={12} style={{ verticalAlign: '-1px', marginRight: 4 }} />{s}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Deal of the Week */}
      {deal && (
        <section style={{ padding: '72px 0 0' }}>
          <div className="container" style={{ maxWidth: 900 }}>
            <div
              onClick={() => router.push(`/vehicle/${deal.id}`)}
              style={{
                background: 'linear-gradient(120deg, #1a1a1a, #2a1a08)', color: 'white', borderRadius: 22,
                padding: 32, display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: 32, alignItems: 'center',
                cursor: 'pointer', border: '1px solid rgba(255,170,60,.35)', position: 'relative', overflow: 'hidden',
              }}
            >
              <div style={{ position: 'absolute', inset: 0, opacity: .25, background: 'radial-gradient(circle at 85% 15%, #ff9d2e, transparent 55%)' }} />
              <div style={{ borderRadius: 16, overflow: 'hidden', aspectRatio: '4/3', background: '#111', position: 'relative' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={(deal as any).images?.[0] || vehicleImageURL(deal, { size: 600 })} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', top: 14, left: 14, background: '#ff9d2e', color: '#1a1a1a', padding: '5px 11px', borderRadius: 999, fontSize: 11, fontWeight: 800, letterSpacing: '.04em' }}>
                  🔥 DEAL OF THE WEEK
                </div>
              </div>
              <div style={{ position: 'relative' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#caa', marginBottom: 4 }}>{deal.year}</div>
                <h2 style={{ fontFamily: 'var(--display)', fontSize: 34, fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 12px', lineHeight: 1.1 }}>
                  {deal.make} {deal.model}
                </h2>
                <div style={{ display: 'flex', gap: 14, fontSize: 13, color: '#caa', marginBottom: 16 }}>
                  <span>{fmtMiles(deal.mileage)}</span><span>{deal.fuel}</span><span>{deal.drive}</span>
                </div>
                <div style={{ fontFamily: 'var(--display)', fontSize: 38, fontWeight: 700, marginBottom: 16 }}>{fmtPrice(deal.price)}</div>
                <button className="btn btn-primary btn-lg" style={{ width: '100%', background: '#ff9d2e', color: '#1a1a1a', borderColor: '#ff9d2e' }}>
                  See this week&apos;s deal <Icon name="arrowRight" size={14} />
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* AI's top pick */}
      {featured.length > 0 && (
      <section style={{ padding: '72px 0 0' }}>
        <div className="container" style={{ maxWidth: 900 }}>
          <div
            onClick={() => router.push(`/vehicle/${featured[0].id}`)}
            style={{
              background: 'white', border: '1px solid var(--line)', borderRadius: 22,
              padding: 32, margin: '0 auto',
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
                <span><Icon name="gauge" size={13} style={{ verticalAlign: '-2px' }}/> {featured[0].mileage.toLocaleString()} km</span>
                <span><Icon name="fuel" size={13} style={{ verticalAlign: '-2px' }}/> {featured[0].fuel}</span>
                <span><Icon name="car" size={13} style={{ verticalAlign: '-2px' }}/> {featured[0].drive}</span>
              </div>
              <p style={{
                fontSize: 14, color: 'var(--muted)', lineHeight: 1.55, margin: '0 0 18px',
                display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden',
              }}>
                {(featured[0].aiSummary || '').slice(0, 140)}{(featured[0].aiSummary || '').length > 140 ? '…' : ''} Carson AI picked this as today's best value.
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
      )}

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

      {/* Recently sold — social proof */}
      {recentlySold.length > 0 && (
        <section style={{ padding: '0 0 80px' }}>
          <div className="container" style={{ maxWidth: 1200 }}>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <h2 style={{ fontFamily: 'var(--display)', fontSize: 28, fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 6px' }}>
                Gone, but not forgotten 💨
              </h2>
              <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>
                These found their new owners recently. Don&apos;t wait on the one you love — or <span onClick={() => router.push('/carfinder')} style={{ color: 'var(--teal-2)', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}>get alerted when your match arrives</span>.
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 18 }}>
              {recentlySold.map(v => (
                <div key={v.id} style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--line)', background: 'white', position: 'relative' }}>
                  <div style={{ aspectRatio: '4/3', background: 'var(--bg-soft)', position: 'relative' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={(v as any).images?.[0] || vehicleImageURL(v, { size: 400 })} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'grayscale(.5)' }} />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ background: 'var(--ink)', color: 'white', padding: '6px 18px', borderRadius: 999, fontSize: 13, fontWeight: 800, letterSpacing: '.08em', transform: 'rotate(-8deg)', boxShadow: '0 4px 14px rgba(0,0,0,.3)' }}>SOLD</span>
                    </div>
                  </div>
                  <div style={{ padding: '12px 14px' }}>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{v.year} {v.make} {v.model}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{fmtMiles(v.mileage)} · {v.fuel}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

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
