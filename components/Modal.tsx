'use client';

import { ReactNode, useEffect } from 'react';
import { Icon } from './Icon';

export function Modal({ open, onClose, title, children, width = 520 }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onEsc);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        animation: 'fadeIn 200ms ease-out',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: 18,
          width: '100%',
          maxWidth: width,
          maxHeight: 'calc(100vh - 40px)',
          overflowY: 'auto',
          animation: 'slideUp 280ms ease-out',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 26px', borderBottom: '1px solid var(--line)' }}>
          <h3 style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 600, letterSpacing: '-.01em', margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--muted)', padding: 0, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '24px 26px 28px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
