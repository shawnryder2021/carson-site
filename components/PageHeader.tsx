import { Icon } from './Icon';

export function PageHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div style={{ paddingTop: 80, paddingBottom: 40, textAlign: 'center' }}>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--teal-tint)', color: 'var(--teal-2)', padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, marginBottom: 20, letterSpacing: '.02em' }}>
        <Icon name="sparkles" size={14}/> {eyebrow}
      </div>
      <h1 style={{ fontFamily: 'var(--display)', fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 600, letterSpacing: '-.02em', margin: '0 0 16px', lineHeight: 1.1 }}>
        {title}
      </h1>
      {subtitle && <p style={{ fontSize: 'clamp(15px, 2vw, 18px)', color: 'var(--muted)', margin: 0, lineHeight: 1.6, maxWidth: 700, marginLeft: 'auto', marginRight: 'auto' }}>{subtitle}</p>}
    </div>
  );
}
