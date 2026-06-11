'use client';

import { useState, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { Footer } from '@/components/Footer';
import { AIConciergeLauncher, AIConcierge } from '@/components/AIConcierge';

export function AppShell({ children }: { children: ReactNode }) {
  const [aiOpen, setAiOpen] = useState(false);
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  const fontStyle = (
    <style>{`
      :root {
        --display: var(--font-bricolage, system-ui, sans-serif);
        --sans: var(--font-inter, system-ui, sans-serif);
        --serif: var(--font-fraunces, Georgia, serif);
      }
    `}</style>
  );

  // Admin renders without the public site chrome.
  if (isAdmin) {
    return (
      <div className="app" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
        {fontStyle}
        {children}
      </div>
    );
  }

  return (
    <div className="app" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
      {fontStyle}
      <TopBar onAIClick={() => setAiOpen(true)} />
      <main style={{ flex: 1 }}>
        {children}
      </main>
      <Footer />
      {!aiOpen && <AIConciergeLauncher onClick={() => setAiOpen(true)} />}
      <AIConcierge open={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  );
}
