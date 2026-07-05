// Shimmer placeholders shaped like the real content. All use the .skeleton
// class from globals.css (respects prefers-reduced-motion). Dimensions mirror
// the real layouts so swapping these in causes no layout shift.

export function SkeletonBox({ w = '100%', h = 16, r = 8, style }: { w?: number | string; h?: number | string; r?: number; style?: React.CSSProperties }) {
  return <div className="skeleton" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

export function VehicleCardSkeleton() {
  return (
    <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden' }}>
      <div className="skeleton" style={{ aspectRatio: '1', borderRadius: 0 }} />
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <SkeletonBox w="70%" h={14} />
        <SkeletonBox w="45%" h={20} />
        <SkeletonBox w="90%" h={12} />
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 6, minCol = 260 }: { count?: number; minCol?: number }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${minCol}px, 1fr))`, gap: 20 }}>
      {Array.from({ length: count }).map((_, i) => <VehicleCardSkeleton key={i} />)}
    </div>
  );
}

export function GallerySkeleton() {
  return (
    <div>
      <div className="skeleton" style={{ aspectRatio: '4/3', borderRadius: 16 }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 10 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ aspectRatio: '4/3', borderRadius: 10 }} />
        ))}
      </div>
    </div>
  );
}

export function RowsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'white', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 18px' }}>
          <SkeletonBox w={76} h={56} r={10} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SkeletonBox w="40%" h={14} />
            <SkeletonBox w="60%" h={12} />
          </div>
          <SkeletonBox w={70} h={28} r={8} />
        </div>
      ))}
    </div>
  );
}
