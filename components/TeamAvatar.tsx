// Photo avatar with an initials fallback so members without photos still look good.
export function TeamAvatar({ name, photoUrl, size = 96, radius }: { name: string; photoUrl?: string; size?: number; radius?: number }) {
  const r = radius ?? size / 2;
  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name}
        style={{ width: size, height: size, borderRadius: r, objectFit: 'cover', display: 'block', background: 'var(--bg-soft)' }}
      />
    );
  }
  const initials = name.split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
  return (
    <div style={{
      width: size, height: size, borderRadius: r,
      background: 'linear-gradient(135deg, var(--teal), #5a8aff)',
      color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--display)', fontWeight: 700, fontSize: size * 0.36, letterSpacing: '-.02em',
      flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}
