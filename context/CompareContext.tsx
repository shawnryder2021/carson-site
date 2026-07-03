'use client';

// Transient comparison shortlist (max 3 vehicles) — localStorage only, no
// account sync: unlike saved cars, a compare set is a moment-in-time decision
// aid, not something to carry across devices.
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

const MAX = 3;

type CompareContextType = {
  compare: string[];
  toggleCompare: (id: string) => void;
  removeCompare: (id: string) => void;
  clearCompare: () => void;
  setCompare: (ids: string[]) => void;
  isFull: boolean;
};
const Ctx = createContext<CompareContextType | null>(null);

export function CompareProvider({ children }: { children: ReactNode }) {
  const [compare, setCompareState] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setCompareState(JSON.parse(localStorage.getItem('carson_compare') || '[]'));
    setMounted(true);
  }, []);

  const persist = (next: string[]) => {
    localStorage.setItem('carson_compare', JSON.stringify(next));
    setCompareState(next);
  };

  const toggleCompare = (id: string) => {
    setCompareState(s => {
      const next = s.includes(id) ? s.filter(x => x !== id) : s.length >= MAX ? s : [...s, id];
      localStorage.setItem('carson_compare', JSON.stringify(next));
      return next;
    });
  };

  const removeCompare = (id: string) => persist(compare.filter(x => x !== id));
  const clearCompare = () => persist([]);
  const setCompare = (ids: string[]) => persist(Array.from(new Set(ids)).slice(0, MAX));

  if (!mounted) return <>{children}</>;
  return (
    <Ctx.Provider value={{ compare, toggleCompare, removeCompare, clearCompare, setCompare, isFull: compare.length >= MAX }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCompare() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    return {
      compare: [] as string[],
      toggleCompare: () => {},
      removeCompare: () => {},
      clearCompare: () => {},
      setCompare: () => {},
      isFull: false,
    };
  }
  return ctx;
}
