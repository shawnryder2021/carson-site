'use client';

import Image from 'next/image';

// Thin wrapper over next/image for the dynamic, arbitrarily-hosted vehicle
// photos this site deals with. Falls back to `unoptimized` for data: URIs (the
// SVG placeholder from vehicleImageURL) and empty sources, so the Netlify image
// pipeline never chokes on something it can't fetch. Container should keep a
// background (var(--bg-soft)) so there's no flash before load.
export function SmartImage({
  src,
  alt,
  sizes,
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
  const unoptimized = !src || src.startsWith('data:');
  return (
    <Image
      src={src}
      alt={alt}
      fill={fill}
      sizes={sizes || '100vw'}
      priority={priority}
      unoptimized={unoptimized}
      className={className}
      style={{ objectFit: 'cover', ...style }}
    />
  );
}
