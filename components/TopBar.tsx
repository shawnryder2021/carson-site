'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Icon } from './Icon';
import { useSaved } from '@/context/SavedContext';
import { listNav, DEFAULT_NAV, NavItem } from '@/lib/db';

const BODY_CATEGORIES = [
  { label: 'SUVs', body: 'SUV' },
  { label: 'Sedans', body: 'Sedan' },
  { label: 'Trucks', body: 'Truck' },
  { label: 'Coupes', body: 'Coupe' },
  { label: 'Wagons', body: 'Wagon' },
];

export function TopBar({ onAIClick }: { onAIClick: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { saved } = useSaved();
  const [nav, setNav] = useState<NavItem[]>(DEFAULT_NAV);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  useEffect(() => { listNav().then(setNav); }, []);

  const go = (href: string) => { setOpenMenu(null); router.push(href); };

  const hasDropdown = (item: NavItem) => item.autoCategories || (item.children && item.children.length > 0);

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="logo" onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>
          <img src="/carson-logo.svg" alt="Carson Exports" style={{ height: 32 }} />
        </div>

        <nav className="nav">
          {nav.map((item, i) => {
            const key = item.id || `${item.label}-${i}`;
            const active = item.href === '/' ? pathname === '/' : pathname?.startsWith(item.href) && item.href !== '#';
            const dropdown = hasDropdown(item);

            return (
              <div
                key={key}
                style={{ position: 'relative' }}
                onMouseEnter={() => dropdown && setOpenMenu(key)}
                onMouseLeave={() => dropdown && setOpenMenu(null)}
              >
                <button
                  className="nav-link"
                  style={{ fontWeight: active ? 600 : 500, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  onClick={() => item.href && item.href !== '#' ? go(item.href) : setOpenMenu(openMenu === key ? null : key)}
                >
                  {item.label}
                  {dropdown && <Icon name="chevronDown" size={13} style={{ opacity: 0.6 }} />}
                </button>

                {dropdown && openMenu === key && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, paddingTop: 8, zIndex: 60,
                  }}>
                    <div style={{
                      background: 'white', border: '1px solid var(--line)', borderRadius: 12,
                      boxShadow: '0 12px 32px rgba(0,0,0,0.12)', padding: 8, minWidth: 200,
                    }}>
                      {item.autoCategories && (
                        <>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.06em', textTransform: 'uppercase', padding: '6px 12px 4px' }}>Browse by type</div>
                          {BODY_CATEGORIES.map(c => (
                            <button key={c.body} onClick={() => go(`/inventory?body=${c.body}`)} className="nav-drop-item">
                              <Icon name="car" size={15} style={{ color: 'var(--teal)' }} /> {c.label}
                            </button>
                          ))}
                          <button onClick={() => go('/inventory')} className="nav-drop-item" style={{ fontWeight: 600 }}>
                            <Icon name="arrowRight" size={15} style={{ color: 'var(--teal)' }} /> View all inventory
                          </button>
                          {item.children && item.children.length > 0 && <div style={{ height: 1, background: 'var(--line)', margin: '6px 4px' }} />}
                        </>
                      )}
                      {item.children?.map((c, j) => (
                        <button key={c.id || j} onClick={() => go(c.href)} className="nav-drop-item">{c.label}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
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
