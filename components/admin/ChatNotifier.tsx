'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { listChatConversations } from '@/lib/db';

// Polls for new live-chat activity and alerts whoever's logged into admin —
// even on another tab — via a browser notification, a soft beep, and a tab
// title badge. Mounted globally in the admin layout.
export function ChatNotifier() {
  const router = useRouter();
  const seen = useRef<Set<string>>(new Set());
  const primed = useRef(false);
  const baseTitle = useRef<string>('');
  const [perm, setPerm] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    baseTitle.current = document.title;
    if ('Notification' in window) setPerm(Notification.permission);

    const beep = () => {
      try {
        const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
        const ctx = new Ctx();
        const o = ctx.createOscillator(); const g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = 'sine'; o.frequency.value = 880;
        g.gain.setValueAtTime(0.0001, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.32);
        o.start(); o.stop(ctx.currentTime + 0.33);
      } catch { /* ignore */ }
    };

    const tick = async () => {
      let convos;
      try { convos = await listChatConversations(); } catch { return; }
      const unread = convos.filter(c => c.agentUnread && c.status !== 'closed');

      // First pass: remember current state without alerting (avoid a flood on load).
      if (!primed.current) {
        unread.forEach(c => seen.current.add(`${c.id}:${c.lastMessageAt}`));
        primed.current = true;
      } else {
        const fresh = unread.filter(c => !seen.current.has(`${c.id}:${c.lastMessageAt}`));
        if (fresh.length > 0) {
          fresh.forEach(c => seen.current.add(`${c.id}:${c.lastMessageAt}`));
          beep();
          if ('Notification' in window && Notification.permission === 'granted') {
            const c = fresh[0];
            const n = new Notification(fresh.length > 1 ? `${fresh.length} new chat messages` : `New chat — ${c.name || 'Website visitor'}`, {
              body: c.contact ? `Contact: ${c.contact}` : 'A visitor is chatting on the site. Click to reply.',
              tag: 'carson-chat', icon: '/carson-logo.svg',
            });
            n.onclick = () => { window.focus(); router.push('/admin/chat'); n.close(); };
          }
        }
      }

      // Tab title badge.
      document.title = unread.length > 0 ? `(${unread.length}) 💬 ${baseTitle.current}` : baseTitle.current;
    };

    tick();
    const t = setInterval(tick, 8000);
    return () => { clearInterval(t); document.title = baseTitle.current; };
  }, [router]);

  if (perm === 'granted') return null;
  if (!(typeof window !== 'undefined' && 'Notification' in window)) return null;

  return (
    <button
      onClick={async () => setPerm(await Notification.requestPermission())}
      title="Get desktop alerts for new chats"
      style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
        background: 'rgba(255,255,255,0.08)', color: '#cfe', border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 10, padding: '9px 12px', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600,
        marginBottom: 8,
      }}
    >
      🔔 Enable chat alerts
    </button>
  );
}
