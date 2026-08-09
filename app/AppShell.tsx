'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { TopBar } from '@/components/TopBar';
import { Footer } from '@/components/Footer';
import { ChatLauncher, ChatWidget } from '@/components/ChatWidget';
import { CompareTray } from '@/components/CompareTray';
import { SiteSettingsProvider } from '@/context/SiteSettingsContext';
import { ChatProvider, useChatPanel } from '@/context/ChatContext';

// --display / --serif live in globals.css. They used to be duplicated here in an
// inline <style>, where the server escaped the font-name apostrophes to &#x27;
// and the client didn't — a text mismatch that failed hydration on every page
// and dropped the whole tree to client rendering.
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  // Admin renders without the public site chrome.
  if (isAdmin) {
    return (
      <div className="app" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
        {children}
      </div>
    );
  }

  return (
    <SiteSettingsProvider>
      <ChatProvider>
        <PublicChrome>{children}</PublicChrome>
      </ChatProvider>
    </SiteSettingsProvider>
  );
}

// Split out so it sits *inside* ChatProvider and can read the shared open state
// that pages elsewhere in the tree toggle via useChatPanel().
function PublicChrome({ children }: { children: ReactNode }) {
  const { open, openChat, closeChat } = useChatPanel();
  return (
    <div className="app" style={{ fontFamily: 'var(--font-inter), system-ui, sans-serif' }}>
      <TopBar onAIClick={openChat} />
      <main style={{ flex: 1 }}>
        {children}
      </main>
      <Footer />
      <CompareTray />
      {!open && <ChatLauncher onClick={openChat} />}
      <ChatWidget open={open} onClose={closeChat} />
    </div>
  );
}
