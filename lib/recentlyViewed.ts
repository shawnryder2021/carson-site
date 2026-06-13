'use client';

// Lightweight localStorage tracking for the returning-visitor homepage.

const RECENT_KEY = 'carson_recent';
const VISIT_KEY = 'carson_last_visit';
const MAX = 12;

export function recordRecentlyViewed(id: string) {
  if (typeof window === 'undefined') return;
  try {
    const list: string[] = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    const next = [id, ...list.filter(x => x !== id)].slice(0, MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch { /* ignore */ }
}

export function getRecentlyViewed(): string[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}

// Returns the previous visit timestamp (ms) then stamps "now" for next time.
// 0 means this is the first visit we've seen.
export function readAndStampLastVisit(): number {
  if (typeof window === 'undefined') return 0;
  let prev = 0;
  try { prev = +(localStorage.getItem(VISIT_KEY) || 0) || 0; } catch { /* ignore */ }
  try { localStorage.setItem(VISIT_KEY, String(Date.now())); } catch { /* ignore */ }
  return prev;
}
