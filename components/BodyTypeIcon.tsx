// Simple line icons for vehicle body styles (navigation menus, category chips).
// One drawing style for all five: side profile facing left on a 48×28 grid,
// same stroke and wheel positions (trucks and SUVs get slightly bigger wheels),
// so the set reads as a family. Colour follows `currentColor`.

type Body = 'SUV' | 'Sedan' | 'Truck' | 'Coupe' | 'Wagon';

// Body outline with both wheel arches cut out of the sill line (y = 20).
const arches = 'L39.6,20 A3.6,3.6 0 0 0 32.4,20 L15.6,20 A3.6,3.6 0 0 0 8.4,20 L5,20 Z';

const SHAPES: Record<Body, { body: string; lines: string; wheel: number }> = {
  // Two-box, tall roof, near-vertical tailgate.
  SUV: {
    body: `M5,20 L5,13.6 Q5,11.8 6.8,11.4 L10.6,10.6 L13.8,4.8 Q14.6,3.6 16.2,3.6 L39.6,3.6 Q41.4,3.6 42,5.2 L43.6,10.4 Q44,11.2 44,12.6 L44,20 ${arches}`,
    lines: 'M11.6,10.6 L43.4,10.6 M26.6,3.6 L26.6,10.6 M36.6,3.6 L36.6,10.6',
    wheel: 3,
  },
  // Three-box: hood, cabin, trunk.
  Sedan: {
    body: `M5,20 L5,15.6 Q5,13.8 7,13.4 L13.6,12.4 L18,8.2 Q19,7.2 20.6,7.2 L29.4,7.2 Q31,7.2 32,8.2 L35.6,12 L41.6,12.8 Q44,13.2 44,15.4 L44,20 ${arches}`,
    lines: 'M14.4,12.4 L35.2,12.4 M25,7.2 L25,12.4',
    wheel: 2.6,
  },
  // Cab plus open bed.
  Truck: {
    body: `M5,20 L5,14.5 Q5,12.8 6.8,12.4 L11,11.6 L14.2,6.4 Q15,5.2 16.6,5.2 L25,5.2 Q26.2,5.2 26.2,6.4 L26.2,11.6 L44,11.6 L44,20 ${arches}`,
    lines: 'M12,11.6 L26.2,11.6',
    wheel: 3,
  },
  // Low roof, long sloping rear.
  Coupe: {
    body: `M5,20 L5,16.2 Q5,14.4 7,14 L15,13 Q20,8.6 25.4,8.6 Q31,8.6 36,12.6 L41.8,13.6 Q44,14 44,16 L44,20 ${arches}`,
    lines: 'M15.6,13 L35.6,13',
    wheel: 2.6,
  },
  // Sedan nose with a long roof to the back.
  Wagon: {
    body: `M5,20 L5,15.8 Q5,14 7,13.6 L13.8,12.6 L18,8.2 Q19,7.2 20.6,7.2 L39.4,7.2 Q41.2,7.2 42,8.6 L44,12.8 L44,20 ${arches}`,
    lines: 'M14.4,12.6 L43.6,12.6 M26,7.2 L26,12.6 M35.4,7.2 L35.4,12.6',
    wheel: 2.6,
  },
};

export function BodyTypeIcon({ body, size = 40, strokeWidth = 1.8, style }: { body: string; size?: number; strokeWidth?: number; style?: React.CSSProperties }) {
  const s = SHAPES[body as Body] || SHAPES.Sedan;
  return (
    <svg width={size} height={(size * 28) / 48} viewBox="0 0 48 28" fill="none" stroke="currentColor" strokeWidth={strokeWidth}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={style}>
      <path d={s.body} />
      <path d={s.lines} strokeWidth={strokeWidth * 0.8} opacity={0.75} />
      <circle cx="12" cy="20" r={s.wheel} />
      <circle cx="36" cy="20" r={s.wheel} />
    </svg>
  );
}
