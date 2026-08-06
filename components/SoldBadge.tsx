// The rotated SOLD pill used wherever a sold vehicle is shown (homepage
// "recently sold" rail, inventory cards, the vehicle page gallery). Single
// source so the treatment stays consistent.
export function SoldBadge({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dims = {
    sm: { padding: '4px 12px', fontSize: 11 },
    md: { padding: '6px 18px', fontSize: 13 },
    lg: { padding: '10px 30px', fontSize: 20 },
  }[size];
  return (
    <span
      style={{
        background: 'var(--ink)', color: 'white', borderRadius: 999,
        fontWeight: 800, letterSpacing: '.08em',
        transform: 'rotate(-8deg)', boxShadow: '0 4px 14px rgba(0,0,0,.3)',
        ...dims,
      }}
    >
      SOLD
    </span>
  );
}

// Full-cover overlay for an image block (the block must be position:relative).
export function SoldOverlay({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  return (
    <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 3 }}>
      <SoldBadge size={size} />
    </span>
  );
}
