// Shared presentational pieces used across admin reporting pages
// (analytics, traffic, reports). Pure display components, no hooks/state —
// deduplicated out of app/admin/analytics/page.tsx and
// app/admin/traffic/page.tsx's near-identical inline copies.

export function Kpi({ label, value, sub, subColor }: { label: string; value: string; sub?: string; subColor?: string }) {
  return (
    <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, padding: '18px 22px' }}>
      <div style={{ fontFamily: 'var(--display)', fontSize: 30, fontWeight: 700, letterSpacing: '-.02em', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 6 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4, color: subColor || 'var(--muted)' }}>{sub}</div>}
    </div>
  );
}

export function Panel({ title, children, caption }: { title: string; children: React.ReactNode; caption?: string }) {
  return (
    <div style={{ background: 'white', border: '1px solid var(--line)', borderRadius: 14, padding: '20px 24px' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: caption ? 2 : 14 }}>{title}</div>
      {caption && <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 14 }}>{caption}</div>}
      {children}
    </div>
  );
}

// Simple horizontal bar row, reused for event counts / search terms / bucketed lists.
export function BarRow({ label, count, max, color }: { label: string; count: number; max: number; color?: string }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 3 }}>
        <span style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '78%' }}>{label}</span>
        <span style={{ color: 'var(--muted)', fontWeight: 700 }}>{count.toLocaleString()}</span>
      </div>
      <div style={{ height: 6, background: 'var(--bg-soft)', borderRadius: 999 }}>
        <div style={{ height: 6, width: `${Math.round((count / Math.max(1, max)) * 100)}%`, background: color || 'var(--teal)', borderRadius: 999 }} />
      </div>
    </div>
  );
}
