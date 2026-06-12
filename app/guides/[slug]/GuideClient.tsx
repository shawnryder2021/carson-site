'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { DotsAnim } from '@/components/DotsAnim';
import { Guide, GUIDES } from '@/data/guides';
import { listGuides, getGuideBySlug } from '@/lib/db';
import { complete } from '@/lib/ai';

export default function GuideClient({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const [guide, setGuide] = useState<Guide | null | undefined>(undefined);
  const [allGuides, setAllGuides] = useState<Guide[]>(GUIDES);

  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [thinking, setThinking] = useState(false);

  useEffect(() => {
    (async () => {
      const [g, all] = await Promise.all([getGuideBySlug(params.slug), listGuides()]);
      setGuide(g as Guide | null);
      if (all.length) setAllGuides(all as Guide[]);
    })();
  }, [params.slug]);

  if (guide === undefined) {
    return <div className="page fade-in" style={{ padding: '80px 20px', textAlign: 'center', color: 'var(--muted)' }}>Loading…</div>;
  }

  if (!guide) {
    return (
      <div className="page fade-in" style={{ padding: '80px 20px', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 32, fontWeight: 600 }}>Guide not found</h1>
        <button onClick={() => router.push('/guides')} className="btn btn-primary" style={{ marginTop: 24 }}>
          Back to guides <Icon name="arrowRight" size={14} />
        </button>
      </div>
    );
  }

  const related = allGuides.filter(g => g.slug !== guide.slug && g.category === guide.category).slice(0, 2);
  const fallbackRelated = related.length ? related : allGuides.filter(g => g.slug !== guide.slug).slice(0, 2);

  const ask = async (q?: string) => {
    const query = q || question;
    if (!query.trim()) return;
    setThinking(true);
    setAnswer(null);

    const context = guide.body.map(s => `${s.heading}: ${s.text}`).join('\n');
    const prompt = `You're Carson AI. A reader just finished this guide titled "${guide.title}".

Guide content:
${context}

Their follow-up question: "${query}"

Answer helpfully and specifically in 2-4 sentences, in a friendly, honest tone. If relevant, suggest they browse Carson inventory or use the AI finder.`;

    try {
      const reply = await complete(prompt);
      setAnswer(reply);
    } catch {
      setAnswer("I'm having trouble right now — but our team can help at (555) 234-9090.");
    }
    setThinking(false);
    setQuestion('');
  };

  return (
    <div className="page fade-in">
      <article className="container" style={{ maxWidth: 760, padding: '32px 20px 80px' }}>
        {/* Back */}
        <button onClick={() => router.push('/guides')} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, marginBottom: 24 }}>
          ← All guides
        </button>

        {/* Header */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 18 }}>
          <span style={{ background: 'var(--teal-tint)', color: 'var(--teal-2)', padding: '5px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700, letterSpacing: '.03em' }}>{guide.category}</span>
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>{guide.readMins} min read</span>
        </div>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(30px, 5vw, 44px)', fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 16px', lineHeight: 1.1 }}>
          {guide.title}
        </h1>
        <p style={{ fontSize: 18, color: 'var(--muted)', lineHeight: 1.6, margin: '0 0 36px', fontFamily: 'var(--serif)', fontStyle: 'italic' }}>
          {guide.excerpt}
        </p>

        {/* Body */}
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 32 }}>
          {guide.body.map((section, i) => {
            const isTip = section.heading.includes('Carson AI tip');
            if (isTip) {
              return (
                <div key={i} style={{ background: 'linear-gradient(135deg, rgba(0,124,146,0.06), rgba(90,138,255,0.04))', border: '1px solid var(--line)', borderRadius: 14, padding: '22px 26px', margin: '32px 0' }}>
                  <div className="ai-pill" style={{ marginBottom: 12 }}>
                    <span className="ai-dot" /> {section.heading}
                  </div>
                  <p style={{ fontSize: 15.5, lineHeight: 1.65, margin: 0, color: 'var(--ink)' }}>{section.text}</p>
                </div>
              );
            }
            return (
              <div key={i} style={{ marginBottom: 28 }}>
                <h2 style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 600, letterSpacing: '-.01em', margin: '0 0 12px' }}>{section.heading}</h2>
                <p style={{ fontSize: 16.5, lineHeight: 1.7, margin: 0, color: 'var(--ink)' }}>{section.text}</p>
              </div>
            );
          })}
        </div>

        {/* Matching inventory CTA */}
        {guide.matchQuery !== undefined && guide.matchQuery !== '' && (
          <div style={{ background: 'var(--ink)', color: 'white', borderRadius: 16, padding: '24px 28px', margin: '12px 0 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 4 }}>See cars that match this guide</div>
              <div style={{ fontSize: 13, color: '#9ad' }}>Carson AI will surface the best-value options on our lot.</div>
            </div>
            <button onClick={() => router.push(`/inventory?aiQuery=${encodeURIComponent(guide.matchQuery!)}`)} className="btn btn-primary">
              <Icon name="sparkles" size={14} /> Browse matches
            </button>
          </div>
        )}

        {/* Ask AI a follow-up */}
        <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 16, padding: '24px 26px', marginTop: 12 }}>
          <div className="ai-pill" style={{ marginBottom: 14 }}>
            <span className="ai-dot" /> Still have a question?
          </div>
          <p style={{ fontSize: 14, color: 'var(--muted)', margin: '0 0 14px', lineHeight: 1.5 }}>
            Ask Carson AI anything about this topic — it knows this guide and our entire inventory.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={question}
              onChange={e => setQuestion(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && ask()}
              placeholder="e.g., Which of these holds value best?"
              className="input"
              style={{ flex: 1 }}
            />
            <button onClick={() => ask()} disabled={thinking || !question.trim()} className="btn btn-dark">
              <Icon name="sparkles" size={14} /> Ask
            </button>
          </div>
          {thinking && (
            <div style={{ marginTop: 14, fontSize: 14, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Icon name="sparkles" size={14} style={{ color: 'var(--teal)' }} /> Thinking<DotsAnim />
            </div>
          )}
          {answer && !thinking && (
            <div style={{ marginTop: 14, background: 'var(--bg-soft)', borderRadius: 12, padding: '16px 18px', fontSize: 14.5, lineHeight: 1.6, color: 'var(--ink)' }}>
              {answer}
            </div>
          )}
        </div>

        {/* Related */}
        {fallbackRelated.length > 0 && (
          <div style={{ marginTop: 48 }}>
            <h3 style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 600, letterSpacing: '-.01em', marginBottom: 18 }}>Keep reading</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {fallbackRelated.map(g => (
                <div
                  key={g.slug}
                  onClick={() => { router.push(`/guides/${g.slug}`); }}
                  style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, padding: '20px 22px', cursor: 'pointer' }}
                >
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--teal-2)', letterSpacing: '.03em' }}>{g.category.toUpperCase()}</span>
                  <h4 style={{ fontFamily: 'var(--display)', fontSize: 17, fontWeight: 600, margin: '8px 0 0', lineHeight: 1.25 }}>{g.title}</h4>
                </div>
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  );
}
