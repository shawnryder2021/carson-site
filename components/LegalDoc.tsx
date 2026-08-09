import { ReactNode } from 'react';

// Shared shell for the policy pages. Long-form legal reading, so: narrow
// measure, generous leading, and clear section breaks.
export function LegalBody({ updated, children }: { updated: string; children: ReactNode }) {
  return (
    <div className="container" style={{ maxWidth: 760, paddingBottom: 80 }}>
      <div style={{ fontSize: 13, color: 'var(--muted)', paddingBottom: 24, borderBottom: '1px solid var(--line)', marginBottom: 8 }}>
        Last updated: {updated}
      </div>
      {children}
    </div>
  );
}

export function LegalSection({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section style={{ paddingTop: 32 }}>
      <h2 style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 600, letterSpacing: '-.01em', margin: '0 0 12px' }}>{heading}</h2>
      <div style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--ink)' }}>{children}</div>
    </section>
  );
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul style={{ margin: '10px 0 0', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((item, i) => <li key={i} style={{ lineHeight: 1.7 }}>{item}</li>)}
    </ul>
  );
}
