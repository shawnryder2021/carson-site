export function DotsAnim() {
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: 'currentColor', display: 'inline-block', animation: `ai-pulse 1.2s ease-in-out infinite ${i * 0.2}s` }}/>
      ))}
    </span>
  );
}
