'use client';

import Link from 'next/link';
import { useSiteSettings } from '@/context/SiteSettingsContext';

// Every entry is a real anchor, not a router.push button — the footer is the
// site's main internal-linking surface and crawlers need to follow it.
const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  { title: 'Brand', links: [
    { href: '/about', label: 'About Carson' },
    { href: '/team', label: 'Meet the Team' },
    { href: '/testimonials', label: 'Testimonials' },
    { href: '/guides', label: 'Guides' },
  ] },
  { title: 'Shop', links: [
    { href: '/inventory', label: 'Browse Inventory' },
    { href: '/finder', label: 'AI Finder' },
    { href: '/finance', label: 'Financing' },
  ] },
  { title: 'Tools', links: [
    { href: '/tradein', label: 'Trade-In Value' },
    { href: '/compare', label: 'Compare Cars' },
    { href: '/faq', label: 'FAQ' },
  ] },
];

const linkStyle = { color: 'white', textDecoration: 'none' } as const;

export function Footer() {
  const { contactPhone, contactAddress } = useSiteSettings();
  const address = contactAddress || '550 Windmill Rd, Dartmouth, NS B3B 1B3';

  return (
    <footer style={{ background: 'var(--ink)', color: 'white', padding: '60px 0 40px' }}>
      <div className="container" style={{ maxWidth: 1200 }}>
        <div className="rg" style={{ ['--gtc-m' as any]: '1fr 1fr', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 40, marginBottom: 40 }}>
          {COLUMNS.map(col => (
            <div key={col.title}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#9ad', marginBottom: 20 }}>{col.title}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
                {col.links.map(l => (
                  <Link key={l.href} href={l.href} style={linkStyle}>{l.label}</Link>
                ))}
              </div>
            </div>
          ))}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#9ad', marginBottom: 20 }}>Visit</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
              <Link href="/contact" style={linkStyle}>Contact</Link>
              {/* No number until one is set in Admin → Settings. */}
              {contactPhone && <a href={`tel:${contactPhone.replace(/\s/g, '')}`} style={linkStyle}>{contactPhone}</a>}
              <div style={{ fontSize: 12, color: '#9ad' }}>{address}</div>
            </div>
          </div>
        </div>
        <div className="rg" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', fontSize: 12, color: '#9ad' }}>
          <div>© {new Date().getFullYear()} Carson Exports. All rights reserved.</div>
          <div style={{ display: 'flex', gap: 16 }}>
            <Link href="/privacy" style={{ color: '#9ad', textDecoration: 'none' }}>Privacy</Link>
            <Link href="/terms" style={{ color: '#9ad', textDecoration: 'none' }}>Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
