import { HeroConfig, youTubeId } from '@/data/heroConfig';

// Renders the hero media (background YouTube video or image) in a 16:9 frame.
export function HeroMedia({ hero }: { hero: HeroConfig }) {
  const frame: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    aspectRatio: '16 / 9',
    borderRadius: 20,
    overflow: 'hidden',
    background: 'var(--bg-soft)',
    border: '1px solid var(--line)',
  };

  if (hero.mode === 'image' && hero.imageUrl) {
    return (
      <div style={frame}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={hero.imageUrl}
          alt={hero.headline}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>
    );
  }

  const id = youTubeId(hero.videoUrl);
  if (hero.mode === 'video' && id) {
    // Autoplay, muted, looped background-style embed.
    const src =
      `https://www.youtube.com/embed/${id}` +
      `?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&modestbranding=1` +
      `&playsinline=1&rel=0&showinfo=0`;
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

  // Fallback placeholder
  return (
    <div style={{ ...frame, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 14 }}>
      No hero media set
    </div>
  );
}
