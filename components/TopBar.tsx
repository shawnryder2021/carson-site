'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Icon } from './Icon';
import { useSaved } from '@/context/SavedContext';
import { useSiteSettings } from '@/context/SiteSettingsContext';
import { listNav, listVehicles, DEFAULT_NAV, NavItem, AdminVehicle } from '@/lib/db';
import { vehicleImageURL } from '@/data/vehicleImage';
import { fmtPrice } from '@/lib/format';

const BODY_CATEGORIES = [
  { label: 'SUVs', body: 'SUV' },
  { label: 'Sedans', body: 'Sedan' },
  { label: 'Trucks', body: 'Truck' },
  { label: 'Coupes', body: 'Coupe' },
  { label: 'Wagons', body: 'Wagon' },
];

function vehiclePhoto(v: AdminVehicle): string {
  return (v as any).images?.[0] || vehicleImageURL(v, { size: 200 });
}

export function TopBar({ onAIClick }: { onAIClick: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { saved } = useSaved();
  const { contactPhone } = useSiteSettings();
  const phone = contactPhone || '(555) 234-9090';
  const [nav, setNav] = useState<NavItem[]>(DEFAULT_NAV);
  const [vehicles, setVehicles] = useState<AdminVehicle[]>([]);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    listNav().then(setNav);
    listVehicles().then(setVehicles);
  }, []);

  // Close the drawer on navigation.
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const go = (href: string) => { setOpenMenu(null); setMobileOpen(false); router.push(href); };

  const hasDropdown = (item: NavItem) => item.autoCategories || (item.children && item.children.length > 0);

  // One representative (photo-bearing if possible) vehicle per body type.
  const categoryThumb = (body: string): AdminVehicle | undefined => {
    const ofType = vehicles.filter(v => v.body === body && (v as any).status !== 'sold');
    return ofType.find(v => (v as any).images?.length) || ofType[0];
  };

  // Featured column: prefer admin-flagged featured, then newest with photos.
  const featuredVehicles = (() => {
    const avail = vehicles.filter(v => (v as any).status !== 'sold' && (v as any).status !== 'hidden');
    const flagged = avail.filter(v => (v as any).featured);
    const withPhotos = avail.filter(v => (v as any).images?.length && !(v as any).featured);
    return [...flagged, ...withPhotos, ...avail].filter((v, i, a) => a.indexOf(v) === i).slice(0, 3);
  })();

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="logo" onClick={() => router.push('/')} style={{ cursor: 'pointer' }}>
          <img src="/carson-logo.png" alt="Carson Exports" style={{ height: 32 }} />
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
                  <div style={{ position: 'absolute', top: '100%', left: item.autoCategories ? -120 : 0, paddingTop: 8, zIndex: 60 }}>
                    <div style={{
                      background: 'white', border: '1px solid var(--line)', borderRadius: 14,
                      boxShadow: '0 16px 44px rgba(0,0,0,0.14)', padding: 14,
                      minWidth: item.autoCategories ? 560 : 200,
                      display: item.autoCategories ? 'grid' : 'block',
                      gridTemplateColumns: item.autoCategories ? '1.1fr 1fr' : undefined,
                      gap: item.autoCategories ? 16 : undefined,
                    }}>
                      {item.autoCategories && (
                        <>
                          {/* Left: categories with photo thumbnails */}
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.06em', textTransform: 'uppercase', padding: '2px 10px 8px' }}>Browse by type</div>
                            {BODY_CATEGORIES.map(c => {
                              const thumb = categoryThumb(c.body);
                              const count = vehicles.filter(v => v.body === c.body && (v as any).status !== 'sold' && (v as any).status !== 'hidden').length;
                              return (
                                <button key={c.body} onClick={() => go(`/inventory?body=${c.body}`)} className="nav-drop-item" style={{ padding: '7px 10px' }}>
                                  <span style={{ width: 56, height: 38, borderRadius: 8, overflow: 'hidden', background: 'var(--bg-soft)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {thumb && (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={vehiclePhoto(thumb)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                                    )}
                                  </span>
                                  <span style={{ flex: 1 }}>
                                    <span style={{ display: 'block', fontWeight: 600 }}>{c.label}</span>
                                    {count > 0 && <span style={{ display: 'block', fontSize: 11.5, color: 'var(--muted)' }}>{count} available</span>}
                                  </span>
                                  <Icon name="arrowRight" size={13} style={{ color: 'var(--muted)' }} />
                                </button>
                              );
                            })}
                            <button onClick={() => go('/inventory')} className="nav-drop-item" style={{ fontWeight: 600, marginTop: 2 }}>
                              <Icon name="arrowRight" size={15} style={{ color: 'var(--teal)' }} /> View all inventory
                            </button>
                          </div>

                          {/* Right: fresh on the lot */}
                          <div style={{ borderLeft: '1px solid var(--line)', paddingLeft: 16 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.06em', textTransform: 'uppercase', padding: '2px 0 8px' }}>Fresh on the lot</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {featuredVehicles.map(v => (
                                <button key={v.id} onClick={() => go(`/vehicle/${v.id}`)} style={{
                                  display: 'flex', gap: 10, alignItems: 'center', width: '100%', textAlign: 'left',
                                  background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                                  padding: 6, borderRadius: 10,
                                }}
                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-soft)')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                >
                                  <span style={{ width: 76, height: 52, borderRadius: 8, overflow: 'hidden', background: 'var(--bg-soft)', flexShrink: 0 }}>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={vehiclePhoto(v)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" />
                                  </span>
                                  <span>
                                    <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.25 }}>{v.year} {v.make} {v.model}</span>
                                    <span style={{ display: 'block', fontSize: 12.5, fontWeight: 700, color: 'var(--teal-2)', marginTop: 2 }}>{fmtPrice(v.price)}</span>
                                  </span>
                                </button>
                              ))}
                              {featuredVehicles.length === 0 && (
                                <div style={{ fontSize: 12.5, color: 'var(--muted)', padding: 6 }}>New arrivals coming soon.</div>
                              )}
                            </div>
                          </div>

                          {item.children && item.children.length > 0 && (
                            <div style={{ gridColumn: '1 / -1', borderTop: '1px solid var(--line)', paddingTop: 6 }}>
                              {item.children.map((c, j) => (
                                <button key={c.id || j} onClick={() => go(c.href)} className="nav-drop-item">{c.label}</button>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                      {!item.autoCategories && item.children?.map((c, j) => (
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
          <button className="icon-btn" title="Saved" onClick={() => router.push('/saved')} style={{ position: 'relative' }}>
            <Icon name="heart" size={18} />
            {saved.length > 0 && (
              <span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--teal)', color: 'white', borderRadius: '50%', width: 18, height: 18, fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {saved.length}
              </span>
            )}
          </button>
          <button className="btn btn-ghost btn-sm topbar-phone" onClick={() => window.open(`tel:${phone.replace(/\s/g, '')}`)}>
            <Icon name="phone" size={14} /> {phone}
          </button>
          <button className="btn btn-dark btn-sm" onClick={onAIClick}>
            <Icon name="sparkles" size={14} /> Find my car
          </button>
          <button className="nav-burger" aria-label={mobileOpen ? 'Close menu' : 'Open menu'} onClick={() => setMobileOpen(o => !o)}>
            {mobileOpen ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="mobile-menu">
          {nav.map((item, i) => {
            const key = item.id || `${item.label}-${i}`;
            return (
              <div key={key}>
                <button className="mobile-menu-link" onClick={() => item.href && item.href !== '#' && go(item.href)}>
                  {item.label}
                  <Icon name="arrowRight" size={15} style={{ color: 'var(--muted)' }} />
                </button>
                {item.autoCategories && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '12px 4px 14px', borderBottom: '1px solid var(--line)' }}>
                    {BODY_CATEGORIES.map(c => (
                      <button key={c.body} onClick={() => go(`/inventory?body=${c.body}`)} style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', borderRadius: 999, padding: '7px 14px', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', color: 'var(--ink)' }}>
                        {c.label}
                      </button>
                    ))}
                  </div>
                )}
                {item.children && item.children.length > 0 && (
                  <div style={{ borderBottom: '1px solid var(--line)', padding: '4px 0 8px' }}>
                    {item.children.map((c, j) => (
                      <button key={c.id || j} className="mobile-menu-sub" onClick={() => go(c.href)}>
                        <Icon name="arrowRight" size={12} style={{ color: 'var(--teal)' }} /> {c.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
            <button className="btn btn-dark btn-lg" style={{ width: '100%' }} onClick={() => { setMobileOpen(false); onAIClick(); }}>
              <Icon name="sparkles" size={15} /> Find my car with AI
            </button>
            <button className="btn btn-ghost btn-lg" style={{ width: '100%' }} onClick={() => window.open(`tel:${phone.replace(/\s/g, '')}`)}>
              <Icon name="phone" size={15} /> Call {phone}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
