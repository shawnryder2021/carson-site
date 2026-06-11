'use client';

import { useState } from 'react';
import { Icon } from './Icon';
import { DotsAnim } from './DotsAnim';
import { complete } from '@/lib/ai';

export function AIConciergeLauncher({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        width: 56,
        height: 56,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, var(--teal), #5a8aff)',
        border: 'none',
        color: 'white',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 8px 24px rgba(0,124,146,0.3)',
        zIndex: 99,
      }}
    >
      <Icon name="sparkles" size={24} />
    </button>
  );
}

export function AIConcierge({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'ai'; text: string }>>([
    { role: 'ai', text: 'Hi! I\'m Carson AI. Ask me anything about cars, financing, trade-ins, or what makes Carson different.' }
  ]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);

  const send = async () => {
    if (!input.trim()) return;
    setMessages(m => [...m, { role: 'user', text: input }]);
    setInput('');
    setThinking(true);

    try {
      const reply = await complete(`${input}\n\nRespond briefly (1-2 sentences) as Carson AI.`);
      setMessages(m => [...m, { role: 'ai', text: reply }]);
    } catch {
      setMessages(m => [...m, { role: 'ai', text: 'I\'m having trouble thinking right now, but our team is here to help. Call (555) 234-9090.' }]);
    }
    setThinking(false);
  };

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 24,
      right: 24,
      width: 420,
      maxHeight: 600,
      background: 'white',
      borderRadius: 16,
      boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 100,
      animation: 'slideUp 300ms ease-out',
    }}>
      <div style={{ background: 'linear-gradient(135deg, var(--teal), #5a8aff)', color: 'white', padding: 16, borderRadius: '16px 16px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Icon name="sparkles" size={18} />
          <span style={{ fontWeight: 600 }}>Carson AI</span>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 0 }}>✕</button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ textAlign: m.role === 'user' ? 'right' : 'left' }}>
            <div style={{
              background: m.role === 'user' ? 'var(--ink)' : 'var(--bg-soft)',
              color: m.role === 'user' ? 'white' : 'var(--ink)',
              padding: '10px 14px',
              borderRadius: 12,
              fontSize: 13,
              lineHeight: 1.5,
              maxWidth: '80%',
              marginLeft: m.role === 'user' ? 'auto' : 0,
            }}>
              {m.text}
            </div>
          </div>
        ))}
        {thinking && (
          <div style={{ textAlign: 'left' }}>
            <div style={{ background: 'var(--bg-soft)', color: 'var(--ink)', padding: '10px 14px', borderRadius: 12, fontSize: 13 }}>
              <DotsAnim />
            </div>
          </div>
        )}
      </div>
      <div style={{ borderTop: '1px solid var(--line)', padding: 12, display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && send()}
          placeholder="Ask me anything..."
          style={{ flex: 1, border: '1px solid var(--line)', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: 'inherit' }}
        />
        <button onClick={send} disabled={!input.trim() || thinking} style={{ background: 'var(--ink)', color: 'white', border: 'none', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Send</button>
      </div>
    </div>
  );
}
