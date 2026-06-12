'use client';

import { useEffect, useState } from 'react';
import { getSocialConfig, InstagramTile, SocialConfig } from '@/lib/db';

// Parses a Behold.so-style JSON feed (tolerant of a few shapes) into tiles.
export function parseInstagramFeed(json: any): InstagramTile[] {
  const arr = Array.isArray(json) ? json : json?.posts || json?.data || [];
  if (!Array.isArray(arr)) return [];
  return arr
    .map((p: any) => ({
      image: p.sizes?.medium?.mediaUrl || p.thumbnailUrl || p.thumbnail_url || p.mediaUrl || p.media_url || p.image || '',
      link: p.permalink || p.link || '',
      caption: (p.prunedCaption || p.caption || '').slice(0, 120),
    }))
    .filter((t: InstagramTile) => !!t.image);
}

export function useInstagram(limit: number) {
  const [config, setConfig] = useState<SocialConfig | null>(null);
  const [tiles, setTiles] = useState<InstagramTile[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const c = await getSocialConfig();
      setConfig(c);
      let t: InstagramTile[] = [];
      if (c.feedUrl) {
        try {
          const res = await fetch(c.feedUrl, { cache: 'no-store' });
          if (res.ok) t = parseInstagramFeed(await res.json());
        } catch { /* fall through to manual tiles */ }
      }
      if (t.length === 0) t = c.posts || [];
      setTiles(t.slice(0, limit));
      setLoaded(true);
    })();
  }, [limit]);

  return { config, tiles, loaded };
}

export function InstagramGrid({ tiles, handle, tileRadius = 12 }: { tiles: InstagramTile[]; handle: string; tileRadius?: number }) {
  if (tiles.length === 0) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
      {tiles.map((t, i) => (
        <a
          key={i}
          href={t.link || `https://www.instagram.com/${handle}/`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ position: 'relative', display: 'block', aspectRatio: '1', borderRadius: tileRadius, overflow: 'hidden', background: 'var(--bg-soft)' }}
          onMouseEnter={e => { const o = e.currentTarget.querySelector('span') as HTMLElement; if (o) o.style.opacity = '1'; }}
          onMouseLeave={e => { const o = e.currentTarget.querySelector('span') as HTMLElement; if (o) o.style.opacity = '0'; }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={t.image} alt={t.caption || 'Instagram post'} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <span style={{
            position: 'absolute', inset: 0, opacity: 0, transition: 'opacity .2s',
            background: 'linear-gradient(to top, rgba(0,0,0,.65), rgba(0,0,0,.15))',
            display: 'flex', alignItems: 'flex-end', padding: 12, color: 'white', fontSize: 12, lineHeight: 1.4, fontWeight: 600,
          }}>
            {t.caption || `View on Instagram ↗`}
          </span>
        </a>
      ))}
    </div>
  );
}
