'use client';

import { useEffect, useRef, useState } from 'react';

// Reveals content once it scrolls into view. Honors prefers-reduced-motion by
// reporting "in view" immediately (content shows, no animation).
export function useInView<T extends HTMLElement = HTMLDivElement>(opts?: {
  once?: boolean;
  threshold?: number;
  rootMargin?: string;
}): [React.RefObject<T>, boolean] {
  const { once = true, threshold = 0.15, rootMargin = '0px 0px -10%' } = opts || {};
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setInView(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (once) obs.disconnect();
        } else if (!once) {
          setInView(false);
        }
      });
    }, { threshold, rootMargin });
    obs.observe(el);
    return () => obs.disconnect();
  }, [once, threshold, rootMargin]);

  return [ref, inView];
}
