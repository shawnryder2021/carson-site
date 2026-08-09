'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getSettings, DEFAULT_SETTINGS, SiteSettings } from '@/lib/db';

// Seeded from the same fallback getSettings() uses, so the site never renders
// blank contact details while the row loads — or if it never arrives.
const DEFAULTS: Pick<SiteSettings, 'contactPhone' | 'contactEmail' | 'contactAddress' | 'hours'> = {
  contactPhone: DEFAULT_SETTINGS.contactPhone,
  contactEmail: DEFAULT_SETTINGS.contactEmail,
  contactAddress: DEFAULT_SETTINGS.contactAddress,
  hours: DEFAULT_SETTINGS.hours,
};

type Ctx = typeof DEFAULTS;
const SiteSettingsCtx = createContext<Ctx>(DEFAULTS);
export const useSiteSettings = () => useContext(SiteSettingsCtx);

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [val, setVal] = useState<Ctx>(DEFAULTS);
  useEffect(() => {
    getSettings().catch(() => null).then(s => s && setVal({
      contactPhone: s.contactPhone || '',
      contactEmail: s.contactEmail || '',
      contactAddress: s.contactAddress || '',
      hours: s.hours || [],
    }));
  }, []);
  return <SiteSettingsCtx.Provider value={val}>{children}</SiteSettingsCtx.Provider>;
}
