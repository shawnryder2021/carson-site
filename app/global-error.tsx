'use client';

// Catches errors in the root layout itself.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', margin: 0, padding: 20 }}>
        <div style={{ maxWidth: 640 }}>
          <h1 style={{ fontSize: 24 }}>Something went wrong</h1>
          <pre style={{ background: '#FDECEE', color: '#A8232C', borderRadius: 10, padding: 14, fontSize: 13, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {error?.message || 'Unknown error'}{error?.digest ? `\ndigest: ${error.digest}` : ''}
          </pre>
          <button onClick={reset} style={{ padding: '10px 16px', borderRadius: 8, background: '#1E8FC4', color: 'white', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
