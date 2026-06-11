// ── Hero configuration ──
// This is the committed DEFAULT shown to every visitor.
// Edit it here and redeploy to change the live site for everyone,
// or use the /admin page to preview changes instantly in your browser.

export type HeroMode = 'video' | 'image';

export type HeroConfig = {
  mode: HeroMode;
  // YouTube URL or ID (used when mode === 'video')
  videoUrl: string;
  // Image URL (used when mode === 'image')
  imageUrl: string;
  headline: string;
  subtext: string;
};

export const DEFAULT_HERO: HeroConfig = {
  mode: 'video',
  videoUrl: 'https://www.youtube.com/watch?v=oPf6ktf4aHI',
  imageUrl: '',
  headline: 'Find the right car.',
  subtext: 'Let Carson AI find your perfect match in 60 seconds.',
};

// Extract a YouTube video ID from a full URL, short URL, or bare ID.
export function youTubeId(input: string): string | null {
  if (!input) return null;
  const s = input.trim();
  // Already a bare 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const m = s.match(re);
    if (m) return m[1];
  }
  return null;
}
