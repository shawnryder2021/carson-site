'use client';

import { useState } from 'react';
import { Icon } from './Icon';
import { makeSwipe } from '@/lib/swipe';

// Photo carousel inside a VehicleCard. Every control stops event propagation so
// the parent card's whole-card click (→ VDP) still fires on a plain tap. Arrows
// only appear on hover (desktop, via .card-carousel:hover — touch never gets a
// stuck hover state); dots + counter are always visible.
export function CardCarousel({
  photos,
  alt,
  fallback,
}: {
  photos: string[];
  alt: string;
  fallback: React.ReactNode;
}) {
  const [i, setI] = useState(0);

  if (!photos || photos.length <= 1) {
    return <>{fallback}</>;
  }

  const go = (dir: -1 | 1, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setI((prev) => (prev + dir + photos.length) % photos.length);
  };
  const swipe = makeSwipe((dir) => setI((prev) => (prev + dir + photos.length) % photos.length));

  return (
    <div
      className="card-carousel"
      onTouchStart={swipe.onTouchStart}
      onTouchEnd={swipe.onTouchEnd}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
    >
      <div style={{ display: 'flex', height: '100%', transform: `translateX(-${i * 100}%)`, transition: 'transform .35s ease' }}>
        {photos.map((src, idx) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={idx} src={src} alt={idx === 0 ? alt : ''} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', flexShrink: 0 }} />
        ))}
      </div>

      {/* Arrows (hover-only via CSS class) */}
      <button className="card-carousel__arrow card-carousel__arrow--l" aria-label="Previous photo" onClick={(e) => go(-1, e)}>
        <Icon name="arrowLeft" size={16} />
      </button>
      <button className="card-carousel__arrow card-carousel__arrow--r" aria-label="Next photo" onClick={(e) => go(1, e)}>
        <Icon name="arrowRight" size={16} />
      </button>

      {/* Counter */}
      <span style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 999, pointerEvents: 'none' }}>
        {i + 1}/{photos.length}
      </span>

      {/* Dots */}
      <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 5, pointerEvents: 'none' }}>
        {photos.slice(0, 8).map((_, idx) => (
          <span key={idx} style={{ width: 6, height: 6, borderRadius: '50%', background: idx === i ? 'white' : 'rgba(255,255,255,0.5)' }} />
        ))}
      </div>
    </div>
  );
}
