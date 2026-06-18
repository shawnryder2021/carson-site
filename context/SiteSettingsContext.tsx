'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getSettings, SiteSettings } from '@/lib/db';

const DEFAULTS: Pick<SiteSettings, 'contactPhone' | 'contactEmail' | 'contactAddress' | 'hours'> = {
  contactPhone: '',
  contactEmail: '',
  contactAddress: '',
  hours: [],
};

type Ctx = typeof DEFAULTS;
const SiteSettingsCtx = createContext<Ctx>(DEFAULTS);
export const useSiteSettings = () => useContext(SiteSettingsCtx);

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [val, setVal] = useState<Ctx>(DEFAULTS);
  useEffect(() => {
    getSettings().then(s => setVal({
      contactPhone: s.contactPhone || '',
      contactEmail: s.contactEmail || '',
      contactAddress: s.contactAddress || '',
      hours: s.hours || [],
    }));
  }, []);
  return <SiteSettingsCtx.Provider value={val}>{children}</SiteSettingsCtx.Provider>;
}
