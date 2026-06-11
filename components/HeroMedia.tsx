import { HeroConfig, youTubeId } from '@/data/heroConfig';

type Variant = 'framed' | 'cover';

// Renders hero media as either a 16:9 framed box (admin preview) or a
// full-bleed background that fills its positioned parent (homepage hero).
export function HeroMedia({ hero, variant = 'framed' }: { hero: HeroConfig; variant?: Variant }) {
  const id = youTubeId(hero.videoUrl);
  const showVideo = hero.mode === 'video' && id;
  const showImage = hero.mode === 'image' && hero.imageUrl;

  // ── COVER: fills the parent (parent must be position:relative + overflow:hidden) ──
  if (variant === 'cover') {
    if (showImage) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={hero.imageUrl}
          alt={hero.headline}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      );
    }
    if (showVideo) {
      const src =
        `https://www.youtube.com/embed/${id}` +
        `?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&modestbranding=1` +
        `&playsinline=1&rel=0&showinfo=0&disablekb=1`;
      return (
        <div className="hero-cover-video" aria-hidden>
          <iframe title={hero.headline} src={src} allow="autoplay; encrypted-media; picture-in-picture" />
        </div>
      );
    }
    return null;
  }

  // ── FRAMED: 16:9 box (used in admin preview) ──
  const frame: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    aspectRatio: '16 / 9',
    borderRadius: 20,
    overflow: 'hidden',
    background: 'var(--bg-soft)',
    border: '1px solid var(--line)',
  };

  if (showImage) {
    return (
      <div style={frame}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={hero.imageUrl} alt={hero.headline} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    );
  }

  if (showVideo) {
    const src =
      `https://www.youtube.com/embed/${id}` +
      `?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&modestbranding=1&playsinline=1&rel=0&showinfo=0`;
    return (
      <div style={frame}>
        <iframe
          title={hero.headline}
          src={src}
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
        />
      </div>
    );
  }

  return (
    <div style={{ ...frame, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 14 }}>
      No hero media set
    </div>
  );
}
