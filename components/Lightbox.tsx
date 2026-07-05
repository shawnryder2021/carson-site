'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { makeSwipe } from '@/lib/swipe';

// Full-screen photo viewer: arrows, keyboard nav, swipe, click-to-zoom.
// Locks body scroll while open and closes on Esc / backdrop / X.
export function Lightbox({
  photos,
  index,
  onIndex,
  onClose,
}: {
  photos: string[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState('center center');

  const prev = () => { setZoom(false); onIndex((index - 1 + photos.length) % photos.length); };
  const next = () => { setZoom(false); onIndex((index + 1) % photos.length); };

  const swipe = makeSwipe((dir) => (dir === 1 ? next() : prev()));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    overlayRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, photos.length]);

  const toggleZoom = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!zoom) {
      const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
    }
    setZoom(z => !z);
  };

  const glassBtn: React.CSSProperties = {
    width: 46, height: 46, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.25)',
    background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(8px)', color: 'white',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  };

  return (
    <div
      ref={overlayRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        outline: 'none',
      }}
    >
      {/* Counter */}
      <div style={{ position: 'absolute', top: 18, left: '50%', transform: 'translateX(-50%)', color: 'white', fontSize: 13, fontWeight: 700, background: 'rgba(255,255,255,0.14)', backdropFilter: 'blur(8px)', padding: '6px 14px', borderRadius: 999 }}>
        {index + 1} / {photos.length}
      </div>
      {/* Close */}
      <button onClick={(e) => { e.stopPropagation(); onClose(); }} aria-label="Close" style={{ ...glassBtn, position: 'absolute', top: 14, right: 16 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
      </button>

      {photos.length > 1 && (
        <button onClick={(e) => { e.stopPropagation(); prev(); }} aria-label="Previous" style={{ ...glassBtn, position: 'absolute', left: 16 }}>
          <Icon name="arrowLeft" size={20} />
        </button>
      )}

      {/* Image */}
      <div
        onTouchStart={swipe.onTouchStart}
        onTouchEnd={swipe.onTouchEnd}
        style={{ maxWidth: '92vw', maxHeight: '86vh', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photos[index]}
          alt={`Photo ${index + 1} of ${photos.length}`}
          onClick={toggleZoom}
          style={{
            maxWidth: '92vw', maxHeight: '86vh', objectFit: 'contain', userSelect: 'none',
            cursor: zoom ? 'zoom-out' : 'zoom-in',
            transform: zoom ? 'scale(2)' : 'scale(1)', transformOrigin: origin,
            transition: 'transform 250ms ease',
          }}
        />
      </div>

      {photos.length > 1 && (
        <button onClick={(e) => { e.stopPropagation(); next(); }} aria-label="Next" style={{ ...glassBtn, position: 'absolute', right: 16 }}>
          <Icon name="arrowRight" size={20} />
        </button>
      )}
    </div>
  );
}
