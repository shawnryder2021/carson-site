'use client';

import { useState, useEffect, useRef } from 'react';
import { Icon } from '@/components/Icon';
import { complete, generateDescriptionPrompt } from '@/lib/ai';
import { getKnowledgeBaseContext } from '@/lib/db';

const QUICK_QUESTIONS = [
  'What are the current financing rates?',
  'How is the monthly payment calculated?',
  'Can I get a loan with no money down?',
  'What are the available term lengths?',
  'How long does the approval process take?',
];

export default function FinancingExplainer() {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'ai'; text: string }>>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [kbContext, setKbContext] = useState('');
  const messagesEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const ctx = await getKnowledgeBaseContext();
      setKbContext(ctx);
    })();
  }, []);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const ask = async (question: string) => {
    if (!question.trim()) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: question }]);
    setThinking(true);

    try {
      const prompt = `You are a friendly Carson Exports financing expert.
A customer is asking: "${question}"

Use this knowledge base context to answer accurately:
${kbContext}

Keep answers concise (2-3 sentences). Be warm and helpful. If the question is outside financing, politely redirect.
Always encourage them to contact Carson for exact quotes or if they need more details.`;

      const reply = await complete(prompt);
      setMessages(prev => [...prev, { role: 'ai', text: reply }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Sorry, I had trouble answering that. Please try again or contact our team directly.' }]);
    }
    setThinking(false);
  };

  return (
    <div className="page fade-in">
      <div style={{ background: 'linear-gradient(135deg, var(--teal), #5a8aff)', color: 'white', padding: '60px 40px', textAlign: 'center', marginBottom: 40 }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <div style={{ fontSize: 14, fontWeight: 700, opacity: 0.9, marginBottom: 12, letterSpacing: '.05em', textTransform: 'uppercase' }}>
            <Icon name="sparkles" size={14} style={{ verticalAlign: '-2px', marginRight: 6 }} />Carson AI Assistant
          </div>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 40, fontWeight: 600, letterSpacing: '-.02em', lineHeight: 1.1, margin: '0 0 12px' }}>Financing Explainer</h1>
          <p style={{ fontSize: 16, opacity: 0.95, margin: 0, lineHeight: 1.6 }}>
            Have questions about payments, rates, or financing options? Ask Carson AI anything — it's trained on our current terms and policies.
          </p>
        </div>
      </div>

      <div className="container" style={{ maxWidth: 700, paddingBottom: 60 }}>
        {/* Chat */}
        <div
          style={{
            background: 'white',
            border: '1px solid var(--line)',
            borderRadius: 16,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            height: 500,
            marginBottom: 20,
          }}
        >
          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {messages.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', textAlign: 'center' }}>
                <div>
                  <Icon name="sparkles" size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Ask me anything about financing</div>
                  <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>Try one of the questions below, or type your own</div>
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      gap: 8,
                    }}
                  >
                    {msg.role === 'ai' && (
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: 'var(--teal-tint)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          color: 'var(--teal)',
                        }}
                      >
                        <Icon name="sparkles" size={14} />
                      </div>
                    )}
                    <div
                      style={{
                        maxWidth: '70%',
                        padding: '10px 14px',
                        borderRadius: 12,
                        background: msg.role === 'user' ? 'var(--teal)' : 'var(--bg-soft)',
                        color: msg.role === 'user' ? 'white' : 'var(--ink)',
                        fontSize: 14,
                        lineHeight: 1.5,
                      }}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {thinking && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        background: 'var(--teal-tint)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        color: 'var(--teal)',
                      }}
                    >
                      <Icon name="sparkles" size={14} />
                    </div>
                    <div style={{ padding: '10px 14px', fontSize: 14, color: 'var(--muted)' }}>Thinking…</div>
                  </div>
                )}
                <div ref={messagesEnd} />
              </>
            )}
          </div>

          {/* Input */}
          <div style={{ borderTop: '1px solid var(--line)', padding: '12px 16px', display: 'flex', gap: 8 }}>
            <input
              type="text"
              className="input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && ask(input)}
              placeholder="Ask a question…"
              disabled={thinking}
            />
            <button onClick={() => ask(input)} disabled={thinking || !input.trim()} className="btn btn-primary btn-sm">
              <Icon name="send" size={14} />
            </button>
          </div>
        </div>

        {/* Quick questions */}
        {messages.length === 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 10 }}>
              Try asking:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {QUICK_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => ask(q)}
                  disabled={thinking}
                  style={{
                    padding: '12px 14px',
                    background: 'var(--bg-soft)',
                    border: '1px solid var(--line)',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontSize: 14,
                    textAlign: 'left',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => {
                    (e.target as HTMLButtonElement).style.background = 'var(--teal-tint)';
                    (e.target as HTMLButtonElement).style.borderColor = 'var(--teal)';
                  }}
                  onMouseLeave={e => {
                    (e.target as HTMLButtonElement).style.background = 'var(--bg-soft)';
                    (e.target as HTMLButtonElement).style.borderColor = 'var(--line)';
                  }}
                >
                  <Icon name="helpCircle" size={13} style={{ verticalAlign: '-2px', marginRight: 6 }} /> {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', borderRadius: 10, padding: '12px 14px', fontSize: 12, color: 'var(--muted)', marginTop: 20 }}>
          <Icon name="info" size={12} style={{ verticalAlign: '-1px', marginRight: 4 }} />
          These are estimates based on current knowledge. For exact rates, approval status, and final terms, please contact our team or visit Carson Exports.
        </div>
      </div>
    </div>
  );
}
