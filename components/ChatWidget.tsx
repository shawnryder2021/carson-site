'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from './Icon';
import { DotsAnim } from './DotsAnim';
import { complete } from '@/lib/ai';

type Suggestion = { id: string; title: string; price: number; image: string; url: string };
type Msg = { role: 'visitor' | 'agent' | 'ai' | 'system'; text: string; suggestions?: Suggestion[] };

// Turn bare URLs in AI/agent text into clickable links.
function renderText(text: string) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return parts.map((p, i) =>
    /^https?:\/\//.test(p)
      ? <a key={i} href={p} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--teal-2)', fontWeight: 600, wordBreak: 'break-word' }}>{p.replace(/^https?:\/\/[^/]+/, '').replace(/^\/vehicle\//, 'View vehicle ↗ ').slice(0, 60) || p}</a>
      : <span key={i}>{p}</span>
  );
}

export function ChatLauncher({ onClick, unseen }: { onClick: () => void; unseen?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label="Open chat"
      style={{
        position: 'fixed', bottom: 24, right: 24, width: 58, height: 58, borderRadius: '50%',
        background: 'linear-gradient(135deg, var(--teal), #5a8aff)', border: 'none', color: 'white',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 24px rgba(0,124,146,0.35)', zIndex: 99,
      }}
    >
      <Icon name="mail" size={24} />
      {unseen && <span style={{ position: 'absolute', top: 2, right: 2, width: 14, height: 14, borderRadius: '50%', background: '#ff4d4f', border: '2px solid white' }} />}
    </button>
  );
}

export function ChatWidget({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [mode, setMode] = useState<'live' | 'ai'>('ai');
  const [fallback, setFallback] = useState(false); // service key missing → client AI only
  const [started, setStarted] = useState(false);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [askContact, setAskContact] = useState(false);

  const convo = useRef<{ id: string; token: string } | null>(null);
  const lastTs = useRef<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const pollTimer = useRef<any>(null);

  // Start the session the first time the widget opens.
  useEffect(() => {
    if (!open || started) return;
    setStarted(true);
    (async () => {
      try {
        const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'start' }) });
        if (res.status === 503) { startFallback(); return; }
        const json = await res.json();
        if (!res.ok || !json.conversationId) { startFallback(); return; }
        convo.current = { id: json.conversationId, token: json.token };
        setMode(json.mode);
        setMessages([{ role: json.open ? 'system' : 'ai', text: json.greeting }]);
        if (json.mode === 'live') setAskContact(true);
      } catch { startFallback(); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const startFallback = () => {
    setFallback(true);
    setMode('ai');
    setMessages([{ role: 'ai', text: "Hi! I'm Carson AI. Ask me anything about our cars, financing, trade-ins, or service — I'm here 24/7." }]);
  };

  // Poll for agent/AI replies in live (server) mode.
  useEffect(() => {
    if (!open || fallback || !convo.current) return;
    pollTimer.current = setInterval(async () => {
      if (!convo.current) return;
      try {
        const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'poll', conversationId: convo.current.id, token: convo.current.token, since: lastTs.current }) });
        const json = await res.json();
        if (json.messages?.length) {
          for (const m of json.messages) {
            lastTs.current = m.created_at;
            if (m.role === 'visitor') continue; // already shown locally
            setMessages(prev => [...prev, { role: m.role, text: m.text }]);
          }
        }
      } catch { /* ignore */ }
    }, 4000);
    return () => clearInterval(pollTimer.current);
  }, [open, fallback, started]);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, thinking]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    setMessages(m => [...m, { role: 'visitor', text }]);

    // Fallback: pure client-side AI.
    if (fallback) {
      setThinking(true);
      try {
        const reply = await complete(`${text}\n\nRespond briefly (1-3 sentences) as Carson AI, a friendly used-car dealership assistant.`);
        setMessages(m => [...m, { role: 'ai', text: reply }]);
      } catch {
        setMessages(m => [...m, { role: 'ai', text: 'Trouble connecting — call us at (902) 555-1234 and we\'ll help right away.' }]);
      }
      setThinking(false);
      return;
    }

    if (!convo.current) return;
    if (mode === 'ai') setThinking(true);
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'send', conversationId: convo.current.id, token: convo.current.token, text, name, contact }) });
      const json = await res.json();
      if (json.reply) setMessages(m => [...m, { role: 'ai', text: json.reply, suggestions: json.suggestions }]);
    } catch { /* poll will recover live replies */ }
    setThinking(false);
  };

  if (!open) return null;

  const live = mode === 'live' && !fallback;
  const headerTitle = live ? 'Carson Exports' : 'Carson AI';
  const headerSub = live ? 'Live — a team member is here' : (fallback ? 'AI assistant · 24/7' : 'After-hours AI · we reply in the morning');

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, width: 'min(420px, calc(100vw - 32px))', height: 'min(600px, calc(100vh - 48px))',
      background: 'white', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column',
      zIndex: 100, animation: 'slideUp 280ms ease-out', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, var(--teal), #5a8aff)', color: 'white', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={live ? 'handshake' : 'sparkles'} size={17} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{headerTitle}</div>
            <div style={{ fontSize: 11.5, opacity: 0.9, display: 'flex', alignItems: 'center', gap: 5 }}>
              {live && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#7BFFB0', display: 'inline-block' }} />}
              {headerSub}
            </div>
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 4, fontSize: 16 }}>✕</button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map((m, i) => {
          if (m.role === 'system') return <div key={i} style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', margin: '4px 0' }}>{m.text}</div>;
          const mine = m.role === 'visitor';
          return (
            <div key={i} style={{ textAlign: mine ? 'right' : 'left' }}>
              {!mine && <div style={{ fontSize: 10.5, color: 'var(--muted)', marginBottom: 2, fontWeight: 700 }}>{m.role === 'agent' ? 'Carson team' : 'Carson AI'}</div>}
              <div style={{ display: 'inline-block', background: mine ? 'var(--ink)' : (m.role === 'agent' ? 'var(--teal-tint)' : 'var(--bg-soft)'), color: mine ? 'white' : 'var(--ink)', padding: '10px 14px', borderRadius: 12, fontSize: 13.5, lineHeight: 1.5, maxWidth: '82%', textAlign: 'left' }}>
                {mine ? m.text : renderText(m.text)}
              </div>
              {/* Vehicle suggestion cards */}
              {m.suggestions && m.suggestions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  {m.suggestions.map(s => (
                    <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', gap: 10, alignItems: 'center', textDecoration: 'none', color: 'var(--ink)', background: 'white', border: '1px solid var(--line)', borderRadius: 10, padding: 8, maxWidth: 300 }}>
                      {s.image
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={s.image} alt="" style={{ width: 60, height: 44, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
                        : <span style={{ width: 60, height: 44, borderRadius: 6, background: 'var(--bg-soft)', flexShrink: 0 }} />}
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.title}</span>
                        <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--teal-2)' }}>${s.price.toLocaleString()}</span>
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>View details →</span>
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {thinking && <div style={{ textAlign: 'left' }}><div style={{ background: 'var(--bg-soft)', padding: '10px 14px', borderRadius: 12, display: 'inline-block' }}><DotsAnim /></div></div>}
        <div ref={bottom} />
      </div>

      {/* Optional contact capture (live mode) */}
      {live && askContact && (
        <div style={{ borderTop: '1px solid var(--line)', padding: '10px 12px', display: 'flex', gap: 8, background: 'var(--bg-soft)' }}>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" style={{ flex: 1, border: '1px solid var(--line)', borderRadius: 8, padding: '7px 10px', fontSize: 12.5, fontFamily: 'inherit' }} />
          <input value={contact} onChange={e => setContact(e.target.value)} placeholder="Email or phone" style={{ flex: 1.4, border: '1px solid var(--line)', borderRadius: 8, padding: '7px 10px', fontSize: 12.5, fontFamily: 'inherit' }} />
          <button onClick={() => setAskContact(false)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 12 }}>✕</button>
        </div>
      )}

      {/* Input */}
      <div style={{ borderTop: '1px solid var(--line)', padding: 12, display: 'flex', gap: 8 }}>
        <input
          type="text" value={input} onChange={e => setInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && send()}
          placeholder={live ? 'Message the team…' : 'Ask anything…'}
          style={{ flex: 1, border: '1px solid var(--line)', borderRadius: 8, padding: '9px 12px', fontSize: 13.5, fontFamily: 'inherit' }}
        />
        <button onClick={send} disabled={!input.trim()} style={{ background: 'var(--teal)', color: 'white', border: 'none', borderRadius: 8, padding: '0 14px', cursor: 'pointer' }}><Icon name="send" size={16} /></button>
      </div>
    </div>
  );
}
