'use client';

import { ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { ChatNotifier } from '@/components/admin/ChatNotifier';
import { getBrowserClient } from '@/lib/supabase/client';

const NAV_GROUPS: { title: string; items: { href: string; label: string; icon: string }[] }[] = [
  { title: '', items: [
    { href: '/admin', label: 'Dashboard', icon: 'gauge' },
    { href: '/admin/analytics', label: 'Analytics', icon: 'trend' },
    { href: '/admin/traffic', label: 'Traffic', icon: 'trend' },
  ] },
  { title: 'Sales', items: [
    { href: '/admin/inventory', label: 'Inventory', icon: 'car' },
    { href: '/admin/leads', label: 'Leads', icon: 'mail' },
    { href: '/admin/chat', label: 'Chat', icon: 'send' },
    { href: '/admin/requests', label: 'CarFinder', icon: 'search' },
  ] },
  { title: 'Homepage', items: [
    { href: '/admin/homepage', label: 'Homepage sections', icon: 'star' },
    { href: '/admin/banners', label: 'Hero & Banners', icon: 'sparkles' },
    { href: '/admin/social', label: 'Social feed', icon: 'heart' },
  ] },
  { title: 'Content', items: [
    { href: '/admin/pages', label: 'Pages', icon: 'edit' },
    { href: '/admin/guides', label: 'Guides', icon: 'brain' },
    { href: '/admin/team', label: 'Team', icon: 'handshake' },
    { href: '/admin/kb', label: 'AI Knowledge Base', icon: 'brain' },
  ] },
  { title: 'Settings', items: [
    { href: '/admin/navigation', label: 'Navigation', icon: 'arrowRight' },
    { href: '/admin/settings', label: 'Site settings', icon: 'shield' },
  ] },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  // Login page: no sidebar chrome
  if (pathname === '/admin/login') return <>{children}</>;

  const signOut = async () => {
    const sb = getBrowserClient();
    if (sb) await sb.auth.signOut();
    router.push('/admin/login');
    router.refresh();
  };

  return (
    <div className="admin-shell" style={{ display: 'grid', gridTemplateColumns: '240px 1fr', minHeight: '100vh' }}>
      {/* Sidebar (top bar on mobile via .admin-* media queries) */}
      <aside className="admin-side" style={{ background: 'var(--ink)', color: 'white', padding: '20px 14px', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' }}>
        <div className="admin-logo" style={{ padding: '0 0 16px', flexShrink: 0 }}>
          <span style={{ background: '#fff', borderRadius: 10, padding: '7px 10px', display: 'inline-block', lineHeight: 0 }}>
            <img src="/carson-logo.png" alt="Carson Exports" style={{ height: 24, display: 'block' }} />
          </span>
          <div style={{ fontSize: 11, color: '#9ad', marginTop: 8, letterSpacing: '.08em', textTransform: 'uppercase' }}>Admin</div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <ChatNotifier />
          {NAV_GROUPS.map((group, gi) => (
            <div className="admin-group" key={group.title || gi}>
              {group.title && (
                <div className="admin-group-label" style={{ fontSize: 10.5, fontWeight: 700, color: '#6b7a85', letterSpacing: '.1em', textTransform: 'uppercase', padding: '14px 12px 5px' }}>
                  {group.title}
                </div>
              )}
              {group.items.map(item => {
                const active = item.href === '/admin' ? pathname === '/admin' : pathname?.startsWith(item.href);
                return (
                  <button
                    key={item.href}
                    onClick={() => router.push(item.href)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9,
                      background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
                      color: active ? 'white' : '#b8c4cc', border: 'none', cursor: 'pointer',
                      fontFamily: 'inherit', fontSize: 13.5, fontWeight: 600, textAlign: 'left', width: '100%',
                    }}
                  >
                    <Icon name={item.icon as any} size={16} /> {item.label}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="admin-foot" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 10, marginTop: 8, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <button onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9, background: 'transparent', color: '#b8c4cc', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, textAlign: 'left' }}>
            <Icon name="arrowLeft" size={15} /> View site
          </button>
          <button onClick={signOut} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 9, background: 'transparent', color: '#b8c4cc', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, textAlign: 'left' }}>
            <Icon name="arrowRight" size={15} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="admin-main" style={{ background: 'var(--bg-soft)', minHeight: '100vh', overflowX: 'hidden' }}>
        {children}
      </main>
    </div>
  );
}
