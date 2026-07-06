'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Icon } from '@/components/Icon';
import { isChatOpen, DEFAULT_CHAT_HOURS, DAY_LABELS } from '@/lib/chatHours';
import {
  listChatConversations, getChatMessages, sendAgentMessage, markChatRead, closeChatConversation,
  getChatSettings, saveChatSettings, getAlertWebhookUrl, saveAlertWebhookUrl, isSupabaseConfigured, ChatConversation, ChatMessage, ChatSettings,
} from '@/lib/db';

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function AdminChat() {
  const [convos, setConvos] = useState<ChatConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<ChatSettings | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [webhook, setWebhook] = useState('');
  const [webhookMsg, setWebhookMsg] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  const loadConvos = useCallback(async () => {
    setConvos(await listChatConversations());
    setLoading(false);
  }, []);

  useEffect(() => { loadConvos(); getChatSettings().then(setSettings); getAlertWebhookUrl().then(setWebhook); }, [loadConvos]);

  const saveWebhook = async () => {
    const { error } = await saveAlertWebhookUrl(webhook);
    setWebhookMsg(error ? `Error: ${error}` : '✓ Saved');
    setTimeout(() => setWebhookMsg(null), 2500);
  };

  // Poll conversation list + active thread.
  useEffect(() => {
    const t = setInterval(() => {
      loadConvos();
      if (activeId) getChatMessages(activeId).then(setMessages);
    }, 5000);
    return () => clearInterval(t);
  }, [activeId, loadConvos]);

  useEffect(() => { bottom.current?.scrollIntoView(); }, [messages]);

  const openConvo = async (id: string) => {
    setActiveId(id);
    setMessages(await getChatMessages(id));
    await markChatRead(id);
    loadConvos();
  };

  const send = async () => {
    if (!reply.trim() || !activeId) return;
    const text = reply.trim();
    setReply('');
    setMessages(m => [...m, { id: 'tmp' + Date.now(), role: 'agent', text, createdAt: new Date().toISOString() }]);
    await sendAgentMessage(activeId, text);
    getChatMessages(activeId).then(setMessages);
  };

  const active = convos.find(c => c.id === activeId);
  const liveNow = settings ? (settings.enabled && isChatOpen(settings.hours?.length ? settings.hours : DEFAULT_CHAT_HOURS, settings.timezone)) : false;
  const unreadCount = convos.filter(c => c.agentUnread && c.status !== 'closed').length;

  const saveSettings = async () => {
    if (!settings) return;
    const { error } = await saveChatSettings(settings);
    setSavedMsg(error ? `Error: ${error}` : '✓ Saved');
    setTimeout(() => setSavedMsg(null), 2500);
  };

  const setDay = (i: number, patch: any) => {
    if (!settings) return;
    const hours = [...(settings.hours?.length ? settings.hours : DEFAULT_CHAT_HOURS)];
    hours[i] = patch;
    setSettings({ ...settings, hours });
  };

  const agents = settings?.agents || [];
  const setAgent = (i: number, patch: any) => settings && setSettings({ ...settings, agents: agents.map((a, j) => j === i ? { ...a, ...patch } : a) });
  const addAgent = () => settings && setSettings({ ...settings, agents: [...agents, { name: '', phone: '', active: true }] });
  const removeAgent = (i: number) => settings && setSettings({ ...settings, agents: agents.filter((_, j) => j !== i) });

  return (
    <div style={{ padding: '24px 28px 40px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 4px' }}>Chat</h1>
          <p style={{ fontSize: 13.5, color: 'var(--muted)', margin: 0 }}>
            {liveNow ? <span style={{ color: '#0F6B2D', fontWeight: 700 }}>● Live hours — visitors reach your team here</span> : <span style={{ color: '#8A5400', fontWeight: 700 }}>● After hours — Carson AI is answering</span>}
            {unreadCount > 0 && <span style={{ marginLeft: 10 }}>· {unreadCount} unread</span>}
          </p>
        </div>
        <button onClick={() => setShowSettings(s => !s)} className="btn btn-ghost btn-sm"><Icon name="shield" size={14} /> Chat settings</button>
      </div>

      {!isSupabaseConfigured && (
        <div style={{ background: '#FFF4E5', color: '#8A5400', borderRadius: 12, padding: '14px 16px', fontSize: 14, marginBottom: 16 }}>Connect Supabase to use chat.</div>
      )}

      {/* Settings panel */}
      {showSettings && settings && (
        <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, padding: '20px 24px', marginBottom: 18 }}>
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600 }}>
              <input type="checkbox" checked={settings.enabled} onChange={e => setSettings({ ...settings, enabled: e.target.checked })} style={{ accentColor: 'var(--teal)' }} />
              Live chat enabled (off = AI answers 24/7)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5 }}>
              Timezone
              <input className="input" value={settings.timezone} onChange={e => setSettings({ ...settings, timezone: e.target.value })} style={{ width: 200 }} />
            </label>
          </div>

          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Live hours (when chats go to your team)</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
            {DAY_LABELS.map((label, i) => {
              const h = (settings.hours?.length ? settings.hours : DEFAULT_CHAT_HOURS)[i];
              const closed = !h;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5 }}>
                  <span style={{ width: 90 }}>{label}</span>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--muted)' }}>
                    <input type="checkbox" checked={!closed} onChange={e => setDay(i, e.target.checked ? { open: '09:00', close: '18:00' } : null)} style={{ accentColor: 'var(--teal)' }} /> Open
                  </label>
                  {!closed && (
                    <>
                      <input type="time" className="input" value={h!.open} onChange={e => setDay(i, { ...h!, open: e.target.value })} style={{ width: 120 }} />
                      <span>–</span>
                      <input type="time" className="input" value={h!.close} onChange={e => setDay(i, { ...h!, close: e.target.value })} style={{ width: 120 }} />
                    </>
                  )}
                  {closed && <span style={{ color: 'var(--muted)' }}>Closed (AI answers)</span>}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }} className="rg">
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>Live greeting</label>
              <textarea className="input" value={settings.greeting} onChange={e => setSettings({ ...settings, greeting: e.target.value })} style={{ minHeight: 70, fontFamily: 'inherit' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 6 }}>After-hours (AI) greeting</label>
              <textarea className="input" value={settings.offlineGreeting} onChange={e => setSettings({ ...settings, offlineGreeting: e.target.value })} style={{ minHeight: 70, fontFamily: 'inherit' }} />
            </div>
          </div>
          {/* Direct-notification note + optional webhook */}
          <div style={{ borderTop: '1px solid var(--line)', margin: '6px 0 14px', paddingTop: 14 }}>
            <div style={{ background: 'var(--teal-tint)', color: 'var(--teal-2)', borderRadius: 10, padding: '10px 12px', fontSize: 12.5, lineHeight: 1.5, marginBottom: 12 }}>
              <Icon name="send" size={12} style={{ verticalAlign: '-1px' }} /> New live chats now <strong>text your sales team directly</strong> (the numbers below) and <strong>email your contact address</strong> automatically — no external tool needed. Requires Twilio &amp; Resend keys in Netlify (already used for CarFinder alerts).
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Optional webhook (Zapier / Make / Slack)</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 8, lineHeight: 1.5 }}>
              New live chats also POST here (event <code>chat.new</code>) if you want to route them into your own automation. Optional — leave blank to rely on the built-in text + email above. Shared with CarFinder &amp; price-drop alerts.
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input className="input" value={webhook} onChange={e => setWebhook(e.target.value)} placeholder="https://hooks.zapier.com/…" style={{ flex: 1, minWidth: 260 }} />
              <button onClick={saveWebhook} className="btn btn-primary btn-sm">Save webhook</button>
            </div>
            {webhookMsg && <div style={{ fontSize: 13, fontWeight: 700, marginTop: 8, color: webhookMsg.startsWith('Error') ? '#A8232C' : 'var(--teal-2)' }}>{webhookMsg}</div>}
          </div>

          {/* Chat agents roster (texted via your Twilio webhook) */}
          <div style={{ borderTop: '1px solid var(--line)', margin: '6px 0 14px', paddingTop: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Chat sales team (texted on new live chats)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {agents.length === 0 && <div style={{ fontSize: 13, color: 'var(--muted)' }}>No one added yet. Add the people who should get a text when a live chat starts.</div>}
              {agents.map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input className="input" value={a.name} onChange={e => setAgent(i, { name: e.target.value })} placeholder="Name" style={{ flex: 1 }} />
                  <input className="input" value={a.phone} onChange={e => setAgent(i, { phone: e.target.value })} placeholder="Mobile (+1902…)" style={{ flex: 1 }} />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: 'var(--muted)' }}>
                    <input type="checkbox" checked={a.active !== false} onChange={e => setAgent(i, { active: e.target.checked })} style={{ accentColor: 'var(--teal)' }} /> On
                  </label>
                  <button onClick={() => removeAgent(i)} className="btn btn-ghost btn-sm" style={{ color: '#A8232C' }}>×</button>
                </div>
              ))}
            </div>
            <button onClick={addAgent} className="btn btn-ghost btn-sm" style={{ marginTop: 8 }}><Icon name="plus" size={13} /> Add team member</button>
          </div>

          {/* AI takeover delay */}
          <div style={{ borderTop: '1px solid var(--line)', margin: '6px 0 14px', paddingTop: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, fontWeight: 600, flexWrap: 'wrap' }}>
              If no team reply within
              <input type="number" min={0} className="input" value={settings.takeoverSeconds}
                onChange={e => setSettings({ ...settings, takeoverSeconds: Math.max(0, +e.target.value || 0) })}
                style={{ width: 90 }} />
              seconds, Carson AI takes over the chat.
            </label>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>
              Set to <strong>0</strong> to disable auto-takeover (chats wait for a human). Try 120 (2 min) and adjust as you test.
            </div>
          </div>

          <button onClick={saveSettings} className="btn btn-primary btn-sm"><Icon name="check" size={14} /> Save settings</button>
          {savedMsg && <span style={{ marginLeft: 12, fontSize: 13, fontWeight: 700, color: savedMsg.startsWith('Error') ? '#A8232C' : 'var(--teal-2)' }}>{savedMsg}</span>}
        </div>
      )}

      {/* Console */}
      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, height: 'calc(100vh - 220px)', minHeight: 420 }} className="rg">
        {/* Conversation list */}
        <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, overflow: 'auto' }}>
          {loading ? <div style={{ padding: 20, color: 'var(--muted)' }}>Loading…</div>
            : convos.length === 0 ? <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13.5 }}>No conversations yet.</div>
            : convos.map(c => (
              <button key={c.id} onClick={() => openConvo(c.id)} style={{
                display: 'block', width: '100%', textAlign: 'left', border: 'none', borderBottom: '1px solid var(--line)', cursor: 'pointer',
                background: activeId === c.id ? 'var(--teal-tint)' : 'white', padding: '12px 14px', fontFamily: 'inherit',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                    {c.agentUnread && c.status !== 'closed' && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff4d4f' }} />}
                    {c.name || 'Visitor'}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{timeAgo(c.lastMessageAt)}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                  {c.contact || 'no contact'}
                  {c.aiActive ? <span style={{ color: '#5a8aff', fontWeight: 700 }}> · 🤖 AI handling</span> : <> · <span style={{ textTransform: 'capitalize' }}>{c.mode}</span></>}
                  {c.status === 'closed' ? ' · closed' : ''}
                </div>
              </button>
            ))}
        </div>

        {/* Thread */}
        <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {!active ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 14 }}>Select a conversation</div>
          ) : (
            <>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{active.name || 'Visitor'}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {active.contact || 'no contact provided'}
                    {active.aiActive && <span style={{ color: '#5a8aff', fontWeight: 700 }}> · 🤖 AI took over — reply to take it back</span>}
                  </div>
                </div>
                {active.status !== 'closed' && <button onClick={() => { closeChatConversation(active.id); loadConvos(); }} className="btn btn-ghost btn-sm">Close</button>}
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {messages.map(m => {
                  if (m.role === 'system') return <div key={m.id} style={{ textAlign: 'center', fontSize: 11.5, color: 'var(--muted)' }}>{m.text}</div>;
                  const isVisitor = m.role === 'visitor';
                  return (
                    <div key={m.id} style={{ textAlign: isVisitor ? 'left' : 'right' }}>
                      <div style={{ fontSize: 10.5, color: 'var(--muted)', marginBottom: 2, fontWeight: 700 }}>{isVisitor ? (active.name || 'Visitor') : m.role === 'ai' ? 'Carson AI' : 'You'}</div>
                      <div style={{ display: 'inline-block', maxWidth: '78%', textAlign: 'left', padding: '9px 13px', borderRadius: 12, fontSize: 13.5, lineHeight: 1.5, background: isVisitor ? 'var(--bg-soft)' : m.role === 'ai' ? '#eef2ff' : 'var(--teal)', color: isVisitor || m.role === 'ai' ? 'var(--ink)' : 'white' }}>{m.text}</div>
                    </div>
                  );
                })}
                <div ref={bottom} />
              </div>
              <div style={{ borderTop: '1px solid var(--line)', padding: 12, display: 'flex', gap: 8 }}>
                <input value={reply} onChange={e => setReply(e.target.value)} onKeyPress={e => e.key === 'Enter' && send()} placeholder="Type your reply…" className="input" style={{ flex: 1 }} />
                <button onClick={send} disabled={!reply.trim()} className="btn btn-primary btn-sm"><Icon name="send" size={15} /></button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
