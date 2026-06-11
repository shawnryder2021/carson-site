'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type SavedContextType = { saved: string[]; toggleSave: (id: string) => void };
const Ctx = createContext<SavedContextType | null>(null);

export function SavedProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setSaved(JSON.parse(localStorage.getItem('carson_saved') || '[]'));
    setMounted(true);
  }, []);

  const toggleSave = (id: string) => {
    setSaved(s => {
      const next = s.includes(id) ? s.filter(x => x !== id) : [...s, id];
      localStorage.setItem('carson_saved', JSON.stringify(next));
      return next;
    });
  };

  if (!mounted) return <>{children}</>;
  return <Ctx.Provider value={{ saved, toggleSave }}>{children}</Ctx.Provider>;
}

export function useSaved() {
  const ctx = useContext(Ctx);
  if (!ctx) return { saved: [], toggleSave: () => {} };
  return ctx;
}
