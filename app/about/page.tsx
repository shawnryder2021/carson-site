'use client';

import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { PageHeader } from '@/components/PageHeader';

export default function AboutPage() {
  const router = useRouter();

  return (
    <div className="page fade-in">
      <PageHeader
        eyebrow="About Carson Exports"
        title="A family-run dealership doing things differently."
        subtitle="We started Carson Exports with one goal: take the games out of buying a used car. That's still the only thing we obsess over."
      />
      <div className="container" style={{ maxWidth: 1080, paddingBottom: 80 }}>
        {/* Stats */}
        <div className="rg" style={{ ['--gtc-m' as any]: '1fr 1fr', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0, background: 'var(--ink)', color: 'white', borderRadius: 18, padding: '32px 0', marginBottom: 48 }}>
          {[{ n: '4,200+', l: 'Cars sold' }, { n: '4.9★', l: 'Avg. rating · 1,800+ reviews' }, { n: '142-pt', l: 'Inspection on every car' }, { n: '7-day', l: 'Worry-free returns' }].map((s, i) => (
            <div key={i} style={{ padding: '0 28px', textAlign: 'center', borderRight: i < 3 ? '1px solid #2a2a2a' : 'none' }}>
              <div style={{ fontFamily: 'var(--display)', fontSize: 'clamp(26px,3.2vw,40px)', fontWeight: 600, letterSpacing: '-.02em', lineHeight: 1 }}>{s.n}</div>
              <div style={{ fontSize: 12, color: '#9aa', marginTop: 8 }}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Why AI */}
        <div className="rg" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center', marginBottom: 56 }}>
          <div>
            <div className="ai-pill" style={{ marginBottom: 16 }}><span className="ai-dot" />Why we built Carson AI</div>
            <h2 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(26px,3.4vw,38px)', fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 16px', lineHeight: 1.1 }}>
              Buying a used car shouldn&apos;t feel like a fight.
            </h2>
            <p style={{ fontSize: 15, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 20 }}>
              Most people walk in nervous — too many decisions, and the dealer usually knows more than you. So we trained an AI on every car on our lot. Ask it anything — &ldquo;Is this price fair?&rdquo; &ldquo;Is this right for my family?&rdquo; — and get an honest answer, even after hours.
            </p>
            <button className="btn btn-primary" onClick={() => router.push('/finder')}>
              Try the AI finder <Icon name="arrowRight" size={14} />
            </button>
          </div>
          <div style={{ background: 'var(--bg-soft)', borderRadius: 18, padding: '30px 34px' }}>
            <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600, marginBottom: 14 }}>
              <Icon name="sparkles" size={14} style={{ verticalAlign: '-2px', color: 'var(--teal)' }} /> Customer asked
            </div>
            <div style={{ fontFamily: 'var(--serif)', fontSize: 20, fontStyle: 'italic', lineHeight: 1.45, marginBottom: 16 }}>
              &ldquo;Can you honestly tell me if this hybrid is a smart buy for a 100 km daily commute?&rdquo;
            </div>
            <div style={{ height: 1, background: 'var(--line)', marginBottom: 16 }} />
            <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600, marginBottom: 8 }}>Carson AI replied</div>
            <div style={{ fontSize: 14.5, lineHeight: 1.55 }}>
              &ldquo;For 100 km a day, the hybrid pays for its premium in under four years on fuel alone. If you&apos;re keeping it longer than that, the math works. Want me to compare it to the gas version?&rdquo;
            </div>
          </div>
        </div>

        {/* Team teaser */}
        <div style={{ background: 'linear-gradient(135deg, rgba(0,124,146,0.07), rgba(90,138,255,0.05))', border: '1px solid var(--line)', borderRadius: 18, padding: '30px 36px', marginBottom: 56, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--display)', fontSize: 24, fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 6px' }}>The people behind the lot</h3>
            <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>Videos, fun facts, and the folks who&apos;ll actually hand you the keys.</p>
          </div>
          <button className="btn btn-dark" onClick={() => router.push('/team')}>
            <Icon name="handshake" size={14} /> Meet the team
          </button>
        </div>

        {/* Promises */}
        <h3 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(22px,3vw,30px)', fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 20px' }}>The Carson promise.</h3>
        <div className="rg" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 56 }}>
          {[
            { icon: 'shield', title: '142-point inspection', desc: "If it doesn't pass, we don't sell it." },
            { icon: 'dollar', title: 'Honest pricing', desc: 'Live market data on every car — no hidden fees.' },
            { icon: 'handshake', title: '7-day return', desc: "Not the one? Bring it back within 7 days or 250 km." },
            { icon: 'phone', title: 'Real humans available', desc: 'AI for fast answers, our team when you want to talk.' },
            { icon: 'award', title: 'No-pressure shopping', desc: "Browse, ask, come in when you're ready. We don't chase." },
            { icon: 'location', title: 'Local & family-run', desc: "We're at 550 Windmill Rd in Dartmouth. Come say hi." },
          ].map(p => (
            <div key={p.title} style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', borderRadius: 14, padding: '20px 22px' }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: 'var(--teal-tint)', color: 'var(--teal-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Icon name={p.icon as any} size={19} />
              </div>
              <div style={{ fontSize: 15.5, fontWeight: 700, marginBottom: 4 }}>{p.title}</div>
              <div style={{ fontSize: 13.5, color: 'var(--muted)', lineHeight: 1.5 }}>{p.desc}</div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ background: 'linear-gradient(135deg, var(--teal), #5a8aff)', borderRadius: 20, padding: '36px 44px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ fontFamily: 'var(--display)', fontSize: 28, fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 6px' }}>Ready to find your car?</h3>
            <div style={{ fontSize: 15, opacity: 0.9 }}>Tell Carson AI what you&apos;re looking for. We&apos;ll do the rest.</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-dark" onClick={() => router.push('/finder')}>
              <Icon name="sparkles" size={14} /> Try the AI finder
            </button>
            <button className="btn btn-ghost" style={{ color: 'white', borderColor: 'rgba(255,255,255,.4)' }} onClick={() => router.push('/inventory')}>
              Browse inventory
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
