'use client';

// Owns the "is the chat panel open" flag so any page can open it — the FAQ's
// "Talk to Carson AI" button, for instance — instead of only the top bar.
import { createContext, useContext, useCallback, useMemo, useState, ReactNode } from 'react';

type Ctx = { open: boolean; openChat: () => void; closeChat: () => void };

const ChatCtx = createContext<Ctx>({ open: false, openChat: () => {}, closeChat: () => {} });
export const useChatPanel = () => useContext(ChatCtx);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openChat = useCallback(() => setOpen(true), []);
  const closeChat = useCallback(() => setOpen(false), []);
  const value = useMemo(() => ({ open, openChat, closeChat }), [open, openChat, closeChat]);
  return <ChatCtx.Provider value={value}>{children}</ChatCtx.Provider>;
}
