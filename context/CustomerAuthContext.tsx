'use client';

// One shared Supabase auth subscription for the customer-facing site
// (TopBar garage button, SavedContext sync, garage pages). Null-safe when
// Supabase isn't configured — user stays null and the site works as before.
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { getBrowserClient } from '@/lib/supabase/client';

type Ctx = { user: User | null; loading: boolean };
const CustomerAuthCtx = createContext<Ctx>({ user: null, loading: true });
export const useCustomerAuth = () => useContext(CustomerAuthCtx);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = getBrowserClient();
    if (!sb) { setLoading(false); return; }

    sb.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return <CustomerAuthCtx.Provider value={{ user, loading }}>{children}</CustomerAuthCtx.Provider>;
}
