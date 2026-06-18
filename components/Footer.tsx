'use client';

import { useRouter } from 'next/navigation';
import { Icon } from './Icon';
import { useSiteSettings } from '@/context/SiteSettingsContext';

export function Footer() {
  const router = useRouter();
  const { contactPhone, contactAddress } = useSiteSettings();
  const phone = contactPhone || '(555) 234-9090';
  const address = contactAddress || '550 Windmill Rd, Dartmouth, NS B3B 1B3';

  return (
    <footer style={{ background: 'var(--ink)', color: 'white', padding: '60px 0 40px' }}>
      <div className="container" style={{ maxWidth: 1200 }}>
        <div className="rg" style={{ ['--gtc-m' as any]: '1fr 1fr', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 40, marginBottom: 40 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#9ad', marginBottom: 20 }}>Brand</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
              <button onClick={() => router.push('/about')} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', textAlign: 'left', padding: 0, fontFamily: 'inherit' }}>About Carson</button>
              <button onClick={() => router.push('/team')} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', textAlign: 'left', padding: 0, fontFamily: 'inherit' }}>Meet the Team</button>
              <button onClick={() => router.push('/testimonials')} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', textAlign: 'left', padding: 0, fontFamily: 'inherit' }}>Testimonials</button>
              <button onClick={() => router.push('/guides')} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', textAlign: 'left', padding: 0, fontFamily: 'inherit' }}>Guides</button>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#9ad', marginBottom: 20 }}>Shop</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
              <button onClick={() => router.push('/inventory')} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', textAlign: 'left', padding: 0, fontFamily: 'inherit' }}>Browse Inventory</button>
              <button onClick={() => router.push('/finder')} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', textAlign: 'left', padding: 0, fontFamily: 'inherit' }}>AI Finder</button>
              <button onClick={() => router.push('/finance')} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', textAlign: 'left', padding: 0, fontFamily: 'inherit' }}>Financing</button>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#9ad', marginBottom: 20 }}>Tools</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
              <button onClick={() => router.push('/tradein')} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', textAlign: 'left', padding: 0, fontFamily: 'inherit' }}>Trade-In Value</button>
              <button onClick={() => router.push('/faq')} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', textAlign: 'left', padding: 0, fontFamily: 'inherit' }}>FAQ</button>
              <button style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', textAlign: 'left', padding: 0, fontFamily: 'inherit' }}>Inspect My Car</button>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: '#9ad', marginBottom: 20 }}>Visit</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 14 }}>
              <button onClick={() => router.push('/contact')} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', textAlign: 'left', padding: 0, fontFamily: 'inherit' }}>Contact</button>
              <a href={`tel:${phone.replace(/\s/g, '')}`} style={{ color: 'white', textDecoration: 'none' }}>{phone}</a>
              <div style={{ fontSize: 12, color: '#9ad' }}>{address}</div>
            </div>
          </div>
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#9ad' }}>
          <div>© 2024 Carson Exports. All rights reserved.</div>
          <div style={{ display: 'flex', gap: 16 }}>
            <a href="#" style={{ color: '#9ad', textDecoration: 'none' }}>Privacy</a>
            <a href="#" style={{ color: '#9ad', textDecoration: 'none' }}>Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
