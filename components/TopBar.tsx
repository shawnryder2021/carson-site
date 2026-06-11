'use client';

import { usePathname, useRouter } from 'next/navigation';
import { Icon } from './Icon';
import { useSaved } from '@/context/SavedContext';

export function TopBar({ onAIClick }: { onAIClick: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { saved } = useSaved();

  const links = [
    { href: '/', label: 'Home' },
    { href: '/inventory', label: 'Inventory' },
    { href: '/finder', label: 'AI Finder' },
    { href: '/tradein', label: 'Trade-in' },
    { href: '/finance', label: 'Financing' },
    { href: '/guides', label: 'Guides' },
    { href: '/faq', label: 'FAQ' },
    { href: '/testimonials', label: 'Reviews' },
    { href: '/about', label: 'About' },
  ];

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="logo" onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>
          <img src="/carson-logo.svg" alt="Carson Exports" style={{ height: 32 }} />
        </div>
        <nav className="nav">
          {links.map(link => (
            <button
              key={link.href}
              className="nav-link"
              style={{ fontWeight: pathname === link.href ? 600 : 400 }}
              onClick={() => router.push(link.href)}
            >
              {link.label}
            </button>
          ))}
        </nav>
        <div className="topbar-cta">
          <button className="icon-btn" title="Saved" onClick={() => router.push('/inventory')} style={{ position: 'relative' }}>
            <Icon name="heart" size={18} />
            {saved.length > 0 && (
              <span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--teal)', color: 'white', borderRadius: '50%', width: 18, height: 18, fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {saved.length}
              </span>
            )}
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => window.open('tel:(555)234-9090')}>
            <Icon name="phone" size={14} /> (555) 234-9090
          </button>
          <button className="btn btn-dark btn-sm" onClick={onAIClick}>
            <Icon name="sparkles" size={14} /> Find my car
          </button>
        </div>
      </div>
    </header>
  );
}
