'use client';

import { Icon } from '@/components/Icon';
import { PageHeader } from '@/components/PageHeader';

type Testimonial = { name: string; role: string; text: string; rating: number; vehicle?: string };

export default function TestimonialsPage() {
  const testimonials: Testimonial[] = [
    {
      name: 'Sarah Chen',
      role: 'Purchased 2021 Tesla Model 3',
      text: 'I was nervous buying a used EV. Carson AI answered every question I had about battery health, range, and charging costs. The 7-day return gave me peace of mind. Couldn\'t have asked for a better experience.',
      rating: 5,
    },
    {
      name: 'Marcus Johnson',
      role: 'Traded in 2018 Civic',
      text: 'Their trade-in estimate was spot-on and actually $900 above KBB. No haggling, no games. Applied the credit same day and drove home in a RAV4. This is how car buying should work.',
      rating: 5,
    },
    {
      name: 'Elena Rodriguez',
      role: 'Financed 2020 Tucson Hybrid',
      text: 'The financing tool showed me I could comfortably afford a hybrid and save on gas. Saved me from overextending. Pre-approval took minutes. Finally found a dealer that cares about whether you can actually afford the payment.',
      rating: 5,
    },
    {
      name: 'David Park',
      role: 'Purchased 2019 RAV4',
      text: 'Used the AI Finder to narrow down body type and fuel type. Got three solid matches, test drove them all same day. No pressure, no upsell. Just honest recommendations.',
      rating: 5,
    },
    {
      name: 'Jessica Walsh',
      role: 'Purchased 2020 Outback',
      text: 'Returned my first car after 5 days because the clutch feel wasn\'t right for me. No questions, no hassle. Got my refund and found the perfect car on my second try. That\'s the kind of confidence I needed.',
      rating: 5,
    },
    {
      name: 'Robert Kim',
      role: 'Financed 2022 BMW 330i',
      text: 'Coming from a bad previous experience, I was skeptical. But Carson proved that car dealers can be honest. They walked me through the inspection report line-by-line. I know exactly what I\'m buying.',
      rating: 5,
    },
    {
      name: 'Priya Patel',
      role: 'Purchased 2021 Kia Telluride',
      text: 'Asked Carson AI about reliability, cost of ownership, and whether it was right for a 3-kid family. Got a thoughtful, honest answer that actually considered my situation. Felt like talking to a friend, not a salesman.',
      rating: 5,
    },
    {
      name: 'Thomas Berg',
      role: 'Traded in 2015 F-150',
      text: 'Brought in my truck as a trade. Their appraisal came in higher than three other places. Honest pricing, no hidden fees. Now I\'m a Carson customer for life.',
      rating: 5,
    },
  ];

  return (
    <div className="page fade-in">
      <PageHeader
        eyebrow="Testimonials"
        title="Hear from Carson customers."
        subtitle="Over 1,800 five-star reviews. Here's what real people are saying."
      />
      <div className="container" style={{ maxWidth: 1200, paddingBottom: 80 }}>
        {/* Stats Strip */}
        <div className="rg" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 60 }}>
          {[
            { stat: '4.9★', label: 'Average rating' },
            { stat: '1,800+', label: 'Reviews' },
            { stat: '98%', label: 'Would recommend' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--bg-soft)', borderRadius: 14, padding: '28px 24px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--display)', fontSize: 40, fontWeight: 600, letterSpacing: '-.02em', lineHeight: 1, marginBottom: 8 }}>
                {s.stat}
              </div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Testimonials Grid */}
        <div className="rg" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24, marginBottom: 60 }}>
          {testimonials.map((t, i) => (
            <div key={i} style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 16, padding: '28px 30px' }}>
              <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                {[0, 1, 2, 3, 4].map(j => (
                  <Icon key={j} name="star" size={16} style={{ color: 'var(--teal)', fill: 'var(--teal)' }}/>
                ))}
              </div>
              <p style={{ fontSize: 15, color: 'var(--ink)', lineHeight: 1.6, margin: '0 0 16px' }}>
                "{t.text}"
              </p>
              <div style={{ borderTop: '1px solid var(--line)', paddingTop: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{t.name}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>{t.role}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div style={{ background: 'linear-gradient(135deg, var(--teal), #5a8aff)', borderRadius: 20, padding: '48px', color: 'white', textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: 32, fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 12px', lineHeight: 1.2 }}>
            Ready to become a Carson customer?
          </h2>
          <p style={{ fontSize: 16, opacity: 0.95, margin: '0 0 24px' }}>
            Join thousands of happy customers who bought smarter.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn btn-dark">
              <Icon name="sparkles" size={14}/> Try the AI finder
            </button>
            <button className="btn btn-ghost" style={{ color: 'white', borderColor: 'rgba(255,255,255,.4)' }}>
              Browse inventory
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
