'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { HeroConfig, DEFAULT_HERO } from '@/data/heroConfig';

const STORAGE_KEY = 'carson_hero_config';

type HeroContextType = {
  hero: HeroConfig;
  // override applied (admin previewing in this browser)?
  hasOverride: boolean;
  save: (config: HeroConfig) => void;
  reset: () => void;
};

const Ctx = createContext<HeroContextType | null>(null);

export function HeroConfigProvider({ children }: { children: ReactNode }) {
  const [hero, setHero] = useState<HeroConfig>(DEFAULT_HERO);
  const [hasOverride, setHasOverride] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setHero({ ...DEFAULT_HERO, ...parsed });
        setHasOverride(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const save = (config: HeroConfig) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    setHero(config);
    setHasOverride(true);
  };

  const reset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setHero(DEFAULT_HERO);
    setHasOverride(false);
  };

  return <Ctx.Provider value={{ hero, hasOverride, save, reset }}>{children}</Ctx.Provider>;
}

export function useHeroConfig() {
  const ctx = useContext(Ctx);
  if (!ctx) return { hero: DEFAULT_HERO, hasOverride: false, save: () => {}, reset: () => {} };
  return ctx;
}
