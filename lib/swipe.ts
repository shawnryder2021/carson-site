// Minimal horizontal-swipe helper (no dependency). Track a touch start, then
// on end return -1 (swipe right → previous), 1 (swipe left → next), or 0 when
// the movement was small enough to count as a tap (so a card click still fires).
const THRESHOLD = 40;

export function makeSwipe(onSwipe: (dir: -1 | 1) => void) {
  let startX = 0;
  let active = false;
  return {
    onTouchStart(e: React.TouchEvent) {
      startX = e.touches[0].clientX;
      active = true;
    },
    onTouchEnd(e: React.TouchEvent) {
      if (!active) return;
      active = false;
      const dx = e.changedTouches[0].clientX - startX;
      if (Math.abs(dx) < THRESHOLD) return; // tap, not a swipe
      onSwipe(dx < 0 ? 1 : -1);
    },
  };
}
