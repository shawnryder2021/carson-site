'use client';

import { useState } from 'react';
import { Icon } from '@/components/Icon';
import { PageHeader } from '@/components/PageHeader';
import { jsonLdSafe } from '@/lib/escapeHtml';

type FAQ = { q: string; a: string };

export default function FAQPage() {
  const [expanded, setExpanded] = useState<string | null>(null);

  const faqs: FAQ[] = [
    {
      q: 'How does the 7-day return policy work?',
      a: 'Drive it home, live with it for up to 7 days or 250 miles. If it\'s not the one, bring it back for a full refund or exchange. No questions asked. We want you to be sure.'
    },
    {
      q: 'What\'s included in the 142-point inspection?',
      a: 'Every vehicle gets checked for mechanical soundness, safety systems, fluid levels, wear on key components, and title/service history. If it doesn\'t pass, we don\'t sell it. Full inspection reports are available for every car.'
    },
    {
      q: 'How do I get pre-qualified for financing?',
      a: 'Use our Financing tool on the site — it takes 60 seconds and only does a soft credit pull (won\'t affect your score). Carson AI will tell you honestly if the payment fits your budget, and you\'ll get pre-approval terms in minutes.'
    },
    {
      q: 'Can I trade in my car?',
      a: 'Yes. Use our Trade-in tool to get an instant AI estimate based on year, make, model, mileage, and condition. We pay 5% above market average. You can apply that credit toward any car on our lot.'
    },
    {
      q: 'How does Carson AI work?',
      a: 'We trained our AI on every car on our lot, market comps, spec sheets, and pricing data. Ask it anything: "Is this price fair?", "Should I get the hybrid or gas?", "What should I check at test drive?" It gives honest, useful answers 24/7.'
    },
    {
      q: 'Do you have a physical showroom?',
      a: 'Yes — we\'re at 550 Windmill Rd in Dartmouth, NS. You can browse online and test drive by appointment, or just stop by. We\'re open Mon–Fri 9–7, Sat 10–6, Sun 11–5.'
    },
    {
      q: 'What if I find the same car cheaper elsewhere?',
      a: 'Our pricing is based on live market data. If you find a comparable car priced lower elsewhere within 7 days of purchase, we\'ll match it. No haggling required.'
    },
    {
      q: 'How do I schedule a test drive?',
      a: 'Find the car you want on our inventory, click "Schedule Test Drive", or call us at (555) 234-9090. We\'ll get you set up for a time that works. No pressure — come in when you\'re ready.'
    },
    {
      q: 'Can I buy online?',
      a: 'You can browse, filter, ask Carson AI questions, and get pre-approved online. Final paperwork and keys happen in person at our showroom so you can see the car and sign everything.'
    },
    {
      q: 'What warranty do you offer?',
      a: 'Every Carson car comes with a 30-day powertrain warranty and a 7-day return policy. Extended warranty options are available at checkout.'
    },
  ];

  // FAQ rich-results structured data
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <div className="page fade-in">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdSafe(faqJsonLd) }} />
      <PageHeader eyebrow="FAQ" title="Answers to your questions." subtitle="Everything you need to know about buying from Carson — from financing to test drives to what happens if you change your mind."/>
      <div className="container" style={{ maxWidth: 880, paddingBottom: 80 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {faqs.map((faq, i) => (
            <div
              key={i}
              style={{
                background: 'white',
                borderBottom: '1px solid var(--line)',
                borderTop: i === 0 ? '1px solid var(--line)' : 'none',
                borderRadius: i === 0 ? '18px 18px 0 0' : i === faqs.length - 1 ? '0 0 18px 18px' : 'none',
                padding: '24px 28px',
                cursor: 'pointer',
                transition: 'background 200ms',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-soft)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'white')}
              onClick={() => setExpanded(expanded === i.toString() ? null : i.toString())}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: 'var(--ink)', lineHeight: 1.4 }}>
                    {faq.q}
                  </h3>
                </div>
                <Icon
                  name={expanded === i.toString() ? 'chevronUp' : 'chevronDown'}
                  size={20}
                  style={{ color: 'var(--muted)', flexShrink: 0, marginTop: 2, transition: 'transform 200ms' }}
                />
              </div>
              {expanded === i.toString() && (
                <p style={{
                  fontSize: 14,
                  color: 'var(--muted)',
                  lineHeight: 1.6,
                  margin: '16px 0 0',
                  paddingTop: 16,
                  borderTop: '1px solid var(--line)',
                }}>
                  {faq.a}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ background: 'var(--bg-soft)', borderRadius: 18, padding: '32px 36px', marginTop: 40, textAlign: 'center' }}>
          <h3 style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 600, margin: '0 0 8px', letterSpacing: '-.02em' }}>Didn't find what you need?</h3>
          <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 16px' }}>Ask Carson AI or reach out to our team directly.</p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button className="btn btn-dark">
              <Icon name="sparkles" size={14}/> Talk to Carson AI
            </button>
            <button className="btn btn-ghost">
              <Icon name="mail" size={14}/> hello@carsonexports.com
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
