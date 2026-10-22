import Link from 'next/link';
import type { ServerArticle } from '@/lib/serverDb';
import { fmtArticleDate } from '@/lib/news';

// Card for /news listings. Server-safe (no hooks).
export function ArticleCard({ a, large }: { a: ServerArticle; large?: boolean }) {
  return (
    <Link href={`/news/${a.slug}`} style={{ display: 'flex', flexDirection: 'column', background: 'white', border: '1px solid var(--line)', borderRadius: 16, overflow: 'hidden', color: 'var(--ink)', textDecoration: 'none', height: '100%' }}>
      {a.image && (
        <div style={{ aspectRatio: large ? '16/9' : '3/2', background: 'var(--bg-soft)', overflow: 'hidden' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={a.image} alt="" loading={large ? 'eager' : 'lazy'} decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}
      <div style={{ padding: large ? '20px 22px 22px' : '16px 18px 18px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--teal)' }}>{a.category}</div>
        <div style={{ fontFamily: 'var(--display)', fontSize: large ? 26 : 19, fontWeight: 600, lineHeight: 1.25 }}>{a.title}</div>
        {a.excerpt && <div style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.55 }}>{a.excerpt.length > 160 ? a.excerpt.slice(0, 157).trimEnd() + '…' : a.excerpt}</div>}
        {a.publishedAt && <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 'auto' }}>{fmtArticleDate(a.publishedAt)}</div>}
      </div>
    </Link>
  );
}
