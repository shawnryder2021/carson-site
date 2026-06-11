'use client';

// Route-level error boundary: shows the real error message so it can be
// reported, instead of Next.js's generic "Application error" screen.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ maxWidth: 640, width: '100%', background: 'white', border: '1px solid #e8e8e8', borderRadius: 16, padding: '32px 36px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 8px' }}>Something went wrong</h1>
        <p style={{ fontSize: 14, color: '#666', margin: '0 0 16px' }}>
          Sorry about that. The error details below help us fix it fast — please share them with us.
        </p>
        <div style={{ background: '#FDECEE', color: '#A8232C', borderRadius: 10, padding: '12px 14px', fontSize: 13, fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 8 }}>
          {error?.message || 'Unknown error'}
          {error?.digest ? `\n\ndigest: ${error.digest}` : ''}
        </div>
        {error?.stack && (
          <details style={{ marginBottom: 16 }}>
            <summary style={{ fontSize: 12, color: '#666', cursor: 'pointer' }}>Technical details</summary>
            <pre style={{ fontSize: 11, color: '#666', whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 200, overflow: 'auto' }}>{error.stack}</pre>
          </details>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={reset} style={{ padding: '10px 16px', borderRadius: 8, background: '#007C92', color: 'white', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600 }}>
            Try again
          </button>
          <a href="/" style={{ padding: '10px 16px', borderRadius: 8, background: 'white', color: '#000', border: '1px solid #e8e8e8', cursor: 'pointer', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}
