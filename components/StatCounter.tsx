'use client';

import { useEffect, useState } from 'react';
import { useInView } from '@/hooks/useInView';

// Counts up from 0 to `value` when scrolled into view (easeOutCubic).
// Reduced-motion users get the final number immediately (useInView returns
// inView=true right away, and we also skip the animation frame loop).
export function StatCounter({
  value,
  duration = 1400,
  prefix = '',
  suffix = '',
  format,
  style,
}: {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  format?: (n: number) => string;
  style?: React.CSSProperties;
}) {
  const [ref, inView] = useInView<HTMLSpanElement>();
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const reduce = typeof window !== 'undefined' && window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { setN(value); return; }

    let raf = 0;
    let start = 0;
    const step = (t: number) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(eased * value));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration]);

  const text = format ? format(n) : n.toLocaleString();
  return <span ref={ref} style={style}>{prefix}{text}{suffix}</span>;
}
