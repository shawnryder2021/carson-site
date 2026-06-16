'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from './Icon';
import { MarketingBanner } from '@/lib/db';

// Full-bleed marketing-banner carousel for the homepage hero slot.
// AI image background + site-rendered headline / offer / CTA overlay.
export function BannerCarousel({ banners }: { banners: MarketingBanner[] }) {
  const router = useRouter();
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = banners.length;

  useEffect(() => {
    if (n <= 1 || paused) return;
    const t = setInterval(() => setI(prev => (prev + 1) % n), 6000);
    return () => clearInterval(t);
  }, [n, paused]);

  if (n === 0) return null;
  const go = (url: string) => {
    if (!url) return;
    if (/^https?:\/\//i.test(url)) window.open(url, '_blank', 'noopener');
    else router.push(url);
  };

  return (
    <section
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{ position: 'relative', margin: '0 -20px', minHeight: 'min(82vh, 680px)', overflow: 'hidden', background: 'var(--ink)' }}
    >
      {banners.map((b, idx) => {
        const dark = b.theme !== 'light';
        const fg = dark ? 'white' : '#0b0f14';
        const justify = b.align === 'left' ? 'flex-start' : b.align === 'right' ? 'flex-end' : 'center';
        const textAlign = b.align === 'center' ? 'center' : 'left';
        // Scrim weighted toward the copy side for legibility.
        const scrim = b.align === 'right'
          ? `linear-gradient(to left, ${dark ? 'rgba(8,12,18,.72)' : 'rgba(255,255,255,.78)'} 0%, transparent 65%)`
          : b.align === 'left'
            ? `linear-gradient(to right, ${dark ? 'rgba(8,12,18,.72)' : 'rgba(255,255,255,.78)'} 0%, transparent 65%)`
            : `linear-gradient(to bottom, rgba(8,12,18,.35), ${dark ? 'rgba(8,12,18,.7)' : 'rgba(255,255,255,.55)'})`;
        return (
          <div
            key={b.id}
            aria-hidden={idx !== i}
            onClick={() => go(b.ctaUrl)}
            style={{
              position: idx === 0 ? 'relative' : 'absolute', inset: 0,
              opacity: idx === i ? 1 : 0, transition: 'opacity .5s ease',
              pointerEvents: idx === i ? 'auto' : 'none',
              display: 'flex', alignItems: 'center', minHeight: 'min(82vh, 680px)',
              cursor: b.ctaUrl ? 'pointer' : 'default',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b.url} alt={b.headline || 'Promotion'} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            <div aria-hidden style={{ position: 'absolute', inset: 0, background: scrim }} />
            <div className="container" style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: justify }}>
              <div style={{ maxWidth: 620, textAlign, color: fg, padding: '72px 8px' }}>
                {b.offerBadge && (
                  <span style={{ display: 'inline-block', background: 'var(--teal)', color: 'white', fontWeight: 800, fontSize: 13, letterSpacing: '.04em', textTransform: 'uppercase', padding: '6px 14px', borderRadius: 999, marginBottom: 16 }}>
                    {b.offerBadge}
                  </span>
                )}
                {b.headline && (
                  <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(38px, 6vw, 72px)', fontWeight: 700, letterSpacing: '-.01em', lineHeight: 1.02, margin: '0 0 16px', textShadow: dark ? '0 2px 24px rgba(0,0,0,.35)' : 'none' }}>
                    {b.headline}
                  </h1>
                )}
                {b.subhead && (
                  <p style={{ fontSize: 'clamp(16px, 2vw, 21px)', opacity: dark ? 0.92 : 0.75, margin: `0 ${b.align === 'center' ? 'auto' : '0'} 28px`, maxWidth: 540, textShadow: dark ? '0 1px 12px rgba(0,0,0,.4)' : 'none' }}>
                    {b.subhead}
                  </p>
                )}
                {b.ctaLabel && (
                  <button onClick={e => { e.stopPropagation(); go(b.ctaUrl); }} className="btn btn-primary btn-lg" style={{ boxShadow: '0 8px 30px rgba(0,0,0,.25)' }}>
                    {b.ctaLabel} <Icon name="arrowRight" size={15} />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Controls */}
      {n > 1 && (
        <>
          <button aria-label="Previous" onClick={() => setI((i - 1 + n) % n)} style={navBtn('left')}><Icon name="arrowLeft" size={18} /></button>
          <button aria-label="Next" onClick={() => setI((i + 1) % n)} style={navBtn('right')}><Icon name="arrowRight" size={18} /></button>
          <div style={{ position: 'absolute', bottom: 18, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 8, zIndex: 3 }}>
            {banners.map((_, idx) => (
              <button key={idx} aria-label={`Go to slide ${idx + 1}`} onClick={() => setI(idx)} style={{
                width: idx === i ? 26 : 9, height: 9, borderRadius: 999, border: 'none', cursor: 'pointer',
                background: idx === i ? 'white' : 'rgba(255,255,255,.5)', transition: 'width .3s',
              }} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function navBtn(side: 'left' | 'right'): React.CSSProperties {
  return {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)', [side]: 14,
    width: 42, height: 42, borderRadius: '50%', border: 'none', cursor: 'pointer', zIndex: 3,
    background: 'rgba(0,0,0,.35)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
    backdropFilter: 'blur(4px)',
  } as React.CSSProperties;
}
