'use client';

import { ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';
import { getBrowserClient } from '@/lib/supabase/client';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: 'gauge' },
  { href: '/admin/analytics', label: 'Analytics', icon: 'trend' },
  { href: '/admin/inventory', label: 'Inventory', icon: 'car' },
  { href: '/admin/leads', label: 'Leads', icon: 'mail' },
  { href: '/admin/requests', label: 'CarFinder', icon: 'search' },
  { href: '/admin/guides', label: 'Guides', icon: 'sparkles' },
  { href: '/admin/team', label: 'Team', icon: 'handshake' },
  { href: '/admin/kb', label: 'AI Knowledge Base', icon: 'brain' },
  { href: '/admin/navigation', label: 'Navigation', icon: 'arrowRight' },
  { href: '/admin/settings', label: 'Site settings', icon: 'shield' },
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
    <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{ background: 'var(--ink)', color: 'white', padding: '24px 16px', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' }}>
        <div style={{ padding: '0 8px 24px' }}>
          <img src="/carson-logo.svg" alt="Carson" style={{ height: 28, filter: 'brightness(0) invert(1)' }} />
          <div style={{ fontSize: 11, color: '#9ad', marginTop: 6, letterSpacing: '.08em', textTransform: 'uppercase' }}>Admin</div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          {NAV.map(item => {
            const active = item.href === '/admin' ? pathname === '/admin' : pathname?.startsWith(item.href);
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10,
                  background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
                  color: active ? 'white' : '#b8c4cc', border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 14, fontWeight: 600, textAlign: 'left', width: '100%',
                }}
              >
                <Icon name={item.icon as any} size={17} /> {item.label}
              </button>
            );
          })}
        </nav>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'transparent', color: '#b8c4cc', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, textAlign: 'left' }}>
            <Icon name="arrowLeft" size={15} /> View site
          </button>
          <button onClick={signOut} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'transparent', color: '#b8c4cc', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, textAlign: 'left' }}>
            <Icon name="arrowRight" size={15} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ background: 'var(--bg-soft)', minHeight: '100vh', overflowX: 'hidden' }}>
        {children}
      </main>
    </div>
  );
}
