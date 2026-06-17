'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { PageHeader } from '@/components/PageHeader';
import { useEffect } from 'react';
import { GUIDES, Guide } from '@/data/guides';
import { listGuides } from '@/lib/db';

const CATEGORIES = ['All', 'Buying', 'Financing', 'Ownership', 'Trade-in', 'EV & Hybrid'] as const;

const catColor: Record<Guide['category'], string> = {
  'Buying': '#1E8FC4',
  'Financing': '#8A5400',
  'Ownership': '#5a6acf',
  'Trade-in': '#0F6B2D',
  'EV & Hybrid': '#A8232C',
};

export default function GuidesPage() {
  const router = useRouter();
  const [cat, setCat] = useState<(typeof CATEGORIES)[number]>('All');
  const [guides, setGuides] = useState<Guide[]>(GUIDES);
  useEffect(() => { listGuides().then(g => { if (g.length) setGuides(g as Guide[]); }); }, []);

  const filtered = cat === 'All' ? guides : guides.filter(g => g.category === cat);
  const featured = filtered[0];
  const rest = filtered.slice(1);

  return (
    <div className="page fade-in">
      <PageHeader
        eyebrow="Carson Guides"
        title="Buy smarter, not harder."
        subtitle="Honest, jargon-free guides on buying, financing, and owning a used car — written by our team and powered by Carson AI."
      />
      <div className="container" style={{ maxWidth: 1100, paddingBottom: 80 }}>
        {/* Category filter */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 32, justifyContent: 'center' }}>
          {CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setCat(c)}
              style={{
                padding: '8px 16px',
                borderRadius: 999,
                background: cat === c ? 'var(--ink)' : 'white',
                color: cat === c ? 'white' : 'var(--ink)',
                border: '1px solid ' + (cat === c ? 'var(--ink)' : 'var(--line)'),
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Featured guide */}
        {featured && (
          <div
            onClick={() => router.push(`/guides/${featured.slug}`)}
            style={{
              background: 'white', border: '1px solid var(--line)', borderRadius: 20, padding: 32,
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, alignItems: 'center',
              cursor: 'pointer', marginBottom: 32, transition: 'box-shadow 200ms, transform 200ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 14px 36px rgba(0,0,0,0.07)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            <div style={{ background: 'linear-gradient(135deg, rgba(0,124,146,0.08), rgba(90,138,255,0.05))', borderRadius: 16, aspectRatio: '4/3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="sparkles" size={48} style={{ color: 'var(--teal)', opacity: 0.5 }} />
            </div>
            <div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
                <span style={{ background: catColor[featured.category] + '18', color: catColor[featured.category], padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: '.03em' }}>{featured.category}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{featured.readMins} min read</span>
              </div>
              <h2 style={{ fontFamily: 'var(--display)', fontSize: 28, fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 12px', lineHeight: 1.15 }}>
                {featured.title}
              </h2>
              <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.6, margin: '0 0 18px' }}>{featured.excerpt}</p>
              <span className="btn btn-primary">Read guide <Icon name="arrowRight" size={14} /></span>
            </div>
          </div>
        )}

        {/* Grid of remaining guides */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {rest.map(g => (
            <div
              key={g.slug}
              onClick={() => router.push(`/guides/${g.slug}`)}
              style={{
                background: 'white', border: '1px solid var(--line)', borderRadius: 16, padding: '24px 26px',
                cursor: 'pointer', transition: 'box-shadow 200ms, transform 200ms', display: 'flex', flexDirection: 'column',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 28px rgba(0,0,0,0.06)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
                <span style={{ background: catColor[g.category] + '18', color: catColor[g.category], padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, letterSpacing: '.03em' }}>{g.category}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{g.readMins} min</span>
              </div>
              <h3 style={{ fontFamily: 'var(--display)', fontSize: 19, fontWeight: 600, letterSpacing: '-.01em', margin: '0 0 10px', lineHeight: 1.25 }}>{g.title}</h3>
              <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.55, margin: '0 0 16px', flex: 1 }}>{g.excerpt}</p>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--teal-2)' }}>Read guide →</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
