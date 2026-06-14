'use client';

import { useState, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { Footer } from '@/components/Footer';
import { ChatLauncher, ChatWidget } from '@/components/ChatWidget';

export function AppShell({ children }: { children: ReactNode }) {
  const [aiOpen, setAiOpen] = useState(false);
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  // Map the design tokens to the loaded fonts. --display is the dealership's
  // Impact look (Anton is the loaded fallback for devices without Impact).
  const fontStyle = (
    <style>{`
      :root {
        --display: 'Impact', var(--font-anton), 'Haettenschweiler', 'Franklin Gothic Bold', 'Arial Narrow', sans-serif;
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
      {!aiOpen && <ChatLauncher onClick={() => setAiOpen(true)} />}
      <ChatWidget open={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  );
}
