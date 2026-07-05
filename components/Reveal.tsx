'use client';

import { useInView } from '@/hooks/useInView';

// Fades + slides its children up when they scroll into view. `delay` (ms) lets
// callers stagger a row of items. Honors prefers-reduced-motion via useInView
// (content just appears, no transition).
export function Reveal({
  children,
  delay = 0,
  style,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  style?: React.CSSProperties;
  className?: string;
}) {
  const [ref, inView] = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`reveal ${inView ? 'is-in' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms`, ...style }}
    >
      {children}
    </div>
  );
}
