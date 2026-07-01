'use client';

import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { useCustomerAuth } from './CustomerAuthContext';
import { mergeSavedVehicles, listMySavedVehicleIds, addSavedVehicle, removeSavedVehicle } from '@/lib/garage';

type SavedContextType = { saved: string[]; toggleSave: (id: string) => void };
const Ctx = createContext<SavedContextType | null>(null);

export function SavedProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const { user } = useCustomerAuth();
  const mergedFor = useRef<string | null>(null);

  useEffect(() => {
    setSaved(JSON.parse(localStorage.getItem('carson_saved') || '[]'));
    setMounted(true);
  }, []);

  // Signed in (or session restored on load): merge this device's shortlist
  // into the account, then pull the union back so cross-device saves appear.
  // localStorage stays the synchronous source of truth for rendering.
  useEffect(() => {
    if (!user || !mounted || mergedFor.current === user.id) return;
    mergedFor.current = user.id;
    (async () => {
      const local: string[] = JSON.parse(localStorage.getItem('carson_saved') || '[]');
      await mergeSavedVehicles(local);
      const remote = await listMySavedVehicleIds();
      const union = [...local, ...remote.filter(id => !local.includes(id))];
      localStorage.setItem('carson_saved', JSON.stringify(union));
      setSaved(union);
    })();
  }, [user, mounted]);

  const toggleSave = (id: string) => {
    setSaved(s => {
      const removing = s.includes(id);
      const next = removing ? s.filter(x => x !== id) : [...s, id];
      localStorage.setItem('carson_saved', JSON.stringify(next));
      // Fire-and-forget account sync — localStorage stays authoritative here.
      if (user) (removing ? removeSavedVehicle(id) : addSavedVehicle(id)).catch(() => {});
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
