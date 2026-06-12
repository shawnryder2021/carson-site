'use client';

import { Icon } from '@/components/Icon';
import { InstagramGrid, BeholdWidget, useInstagram } from '@/components/InstagramGrid';

export default function SocialPage() {
  const { config, tiles, widgetId, loaded } = useInstagram(18);
  const handle = config?.handle || 'carsonexports';
  const profileUrl = `https://www.instagram.com/${handle}/`;

  return (
    <div className="page fade-in">
      {/* Hero */}
      <div style={{ background: 'linear-gradient(120deg, #833ab4, #fd1d1d 55%, #fcb045)', color: 'white', padding: '60px 24px', textAlign: 'center' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <div style={{ fontSize: 46, marginBottom: 8 }}>📸</div>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(30px,4.5vw,44px)', fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 10px', lineHeight: 1.1 }}>
            Life on the lot.
          </h1>
          <p style={{ fontSize: 16, opacity: .95, lineHeight: 1.6, margin: '0 0 22px' }}>
            New arrivals, sold celebrations, behind-the-scenes, and the occasional dog in a truck bed. Follow along — the best cars are often gone before they hit the listings.
          </p>
          <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-dark btn-lg" style={{ textDecoration: 'none' }}>
            Follow @{handle} <Icon name="arrowRight" size={14} />
          </a>
        </div>
      </div>

      <div className="container" style={{ maxWidth: 1100, padding: '46px 20px 80px' }}>
        {!loaded ? (
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: 60 }}>Loading the feed…</div>
        ) : widgetId ? (
          <>
            <BeholdWidget id={widgetId} />
            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-lg" style={{ textDecoration: 'none' }}>
                See more on Instagram <Icon name="arrowRight" size={14} />
              </a>
            </div>
          </>
        ) : tiles.length > 0 ? (
          <>
            <InstagramGrid tiles={tiles} handle={handle} />
            <div style={{ textAlign: 'center', marginTop: 32 }}>
              <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-lg" style={{ textDecoration: 'none' }}>
                See more on Instagram <Icon name="arrowRight" size={14} />
              </a>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '50px 20px', background: 'var(--bg-soft)', borderRadius: 18 }}>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>The grid is warming up 📷</div>
            <div style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 18 }}>
              Meanwhile, everything we post starts here:
            </div>
            <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary" style={{ textDecoration: 'none' }}>
              Visit @{handle} on Instagram
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
