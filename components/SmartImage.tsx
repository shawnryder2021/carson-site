'use client';

// Renders a vehicle/hero image. Deliberately a plain <img>, NOT next/image:
// vehicle photo URLs come from an admin Google Sheet and can be http://,
// protocol-relative, redirect-style, or otherwise malformed — all of which make
// next/image THROW at render, and one thrown card collapses the whole grid.
// A plain <img> never throws on any URL. We keep lazy-loading + the fill/cover
// layout so the visual behavior (and every call site) is unchanged.
export function SmartImage({
  src,
  alt,
  sizes: _sizes, // no-op for plain <img>; kept for call-site compatibility
  priority,
  fill = true,
  className,
  style,
}: {
  src: string;
  alt: string;
  sizes?: string;
  priority?: boolean;
  fill?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const base: React.CSSProperties = fill
    ? { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }
    : { width: '100%', height: 'auto', objectFit: 'cover' };
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      // @ts-expect-error fetchPriority is valid HTML but not yet in this React's types
      fetchpriority={priority ? 'high' : undefined}
      className={className}
      style={{ ...base, ...style }}
    />
  );
}
