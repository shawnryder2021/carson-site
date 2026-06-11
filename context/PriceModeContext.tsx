'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Mode = 'total' | 'monthly';
type PriceModeContextType = { mode: Mode; setMode: (m: Mode) => void; toggle: () => void };
const Ctx = createContext<PriceModeContextType | null>(null);

export function PriceModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>('total');

  useEffect(() => {
    const saved = localStorage.getItem('carson_price_mode');
    if (saved === 'monthly' || saved === 'total') setMode(saved);
  }, []);

  const update = (m: Mode) => {
    setMode(m);
    localStorage.setItem('carson_price_mode', m);
  };

  return <Ctx.Provider value={{ mode, setMode: update, toggle: () => update(mode === 'total' ? 'monthly' : 'total') }}>{children}</Ctx.Provider>;
}

export function usePriceMode() {
  const ctx = useContext(Ctx);
  if (!ctx) return { mode: 'total' as Mode, setMode: () => {}, toggle: () => {} };
  return ctx;
}

// Small reusable toggle control
export function PriceModeToggle() {
  const { mode, setMode } = usePriceMode();
  return (
    <div style={{ display: 'inline-flex', background: 'var(--bg-soft)', border: '1px solid var(--line)', borderRadius: 999, padding: 3 }}>
      {(['total', 'monthly'] as const).map(m => (
        <button
          key={m}
          onClick={() => setMode(m)}
          style={{
            padding: '6px 14px',
            borderRadius: 999,
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: 12,
            fontWeight: 600,
            background: mode === m ? 'white' : 'transparent',
            color: mode === m ? 'var(--ink)' : 'var(--muted)',
            boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
          }}
        >
          {m === 'total' ? 'Total price' : 'Monthly'}
        </button>
      ))}
    </div>
  );
}
