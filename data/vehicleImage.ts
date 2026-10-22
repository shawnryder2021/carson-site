import { Vehicle } from './inventory';

// Placeholder shown wherever a vehicle has no photos yet. It mimics the
// dealership's real photo set (light studio wall, CARSONEXPORTS.com banner,
// floor shadow) with a line drawing of the body style, so a missing photo reads
// as "being photographed" rather than broken. Returned as an SVG data URI so it
// drops into every <img src> / string call site unchanged.
//
// Drawn on a 400×300 (4:3) canvas. Key content stays inside the centre 300×300
// so square cards that crop with object-fit: cover lose nothing important.

// Side profiles (car faces left) on a ~220×64 grid; wheel arches are cut out of
// the body outline and the wheels drawn separately.
type Profile = { body: string; windows: string[]; wheels: [number, number]; ground: number; r: number; extra?: string };

const ARCH = (front: number, rear: number, r: number, y: number) =>
  `L${rear + r},${y} A${r},${r} 0 0 0 ${rear - r},${y} L${front + r},${y} A${r},${r} 0 0 0 ${front - r},${y}`;

const PROFILES: Record<Vehicle['body'], Profile> = {
  Sedan: {
    body: `M8,58 L8,47 Q9,40 22,38 L64,34 Q84,16 108,15 L142,15 Q160,16 180,33 L206,38 Q214,40 214,48 L214,58 ${ARCH(51, 175, 17, 58)} Z`,
    windows: ['M72,34 Q88,21 108,20 L122,20 L122,34 Z', 'M128,34 L128,20 L142,20 Q156,21 171,34 Z'],
    wheels: [51, 175], ground: 58, r: 13,
  },
  SUV: {
    body: `M8,60 L8,40 Q9,32 20,31 L48,29 L66,10 Q70,7 78,7 L172,7 Q182,7 186,14 L198,30 Q212,32 214,40 L214,60 ${ARCH(48, 176, 18, 60)} Z`,
    windows: ['M58,29 L72,13 L112,13 L112,29 Z', 'M118,29 L118,13 L168,13 Q176,13 180,20 L186,29 Z'],
    wheels: [48, 176], ground: 60, r: 14,
  },
  Truck: {
    body: `M8,60 L8,40 Q9,33 20,32 L50,30 L66,10 Q69,7 76,7 L118,7 Q124,7 124,13 L124,32 L212,32 L214,36 L214,60 ${ARCH(48, 176, 18, 60)} Z`,
    windows: ['M60,30 L73,13 L118,13 L118,30 Z'],
    wheels: [48, 176], ground: 60, r: 14,
    extra: 'M128,40 L210,40',
  },
  Coupe: {
    body: `M8,58 L8,48 Q9,42 22,40 L70,36 Q96,18 122,17 L140,17 Q164,19 192,38 L208,41 Q214,43 214,50 L214,58 ${ARCH(51, 175, 17, 58)} Z`,
    windows: ['M78,36 Q98,22 122,21 L146,21 Q164,23 180,36 Z'],
    wheels: [51, 175], ground: 58, r: 13,
  },
  Wagon: {
    body: `M8,58 L8,46 Q9,39 22,37 L60,34 Q80,15 104,14 L190,14 Q200,15 204,24 L210,38 Q214,41 214,48 L214,58 ${ARCH(51, 175, 17, 58)} Z`,
    windows: ['M68,34 Q86,19 104,18 L132,18 L132,34 Z', 'M138,34 L138,18 L188,18 Q196,19 199,26 L203,34 Z'],
    wheels: [51, 175], ground: 58, r: 13,
  },
};

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function vehicleImageURL(vehicle: Vehicle, opts?: { size?: number }): string {
  const size = opts?.size || 200;
  const compact = size < 250; // thumbnails: drawing only, no text
  const p = PROFILES[vehicle.body] || PROFILES.Sedan;
  const ink = '#2B3640';
  const accent = '#1E8FC4'; // logo blue

  // Centre the 222×64 drawing; bigger when there's no text underneath.
  const scale = compact ? 1.0 : 1.05;
  const tx = 200 - 111 * scale;
  const ty = compact ? 112 : 96;

  const full = `${vehicle.year} ${vehicle.make} ${vehicle.model}`.trim();
  const name = esc(full.length > 30 ? full.slice(0, 29).trimEnd() + '…' : full);
  const nameSize = name.length > 26 ? 15 : 18;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
  <defs>
    <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4F6F8"/><stop offset="1" stop-color="#E3E8ED"/></linearGradient>
    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D9DFE5"/><stop offset="1" stop-color="#CBD2D9"/></linearGradient>
    <radialGradient id="shadow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#000" stop-opacity=".18"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="400" height="300" fill="url(#wall)"/>
  <rect y="${compact ? 200 : 186}" width="400" height="${compact ? 100 : 114}" fill="url(#floor)"/>
  ${compact ? '' : `<rect y="0" width="400" height="34" fill="#fff"/><rect y="34" width="400" height="1" fill="#D5DCE3"/>
  <text x="200" y="23" text-anchor="middle" font-family="Arial Black, Arial, Helvetica, sans-serif" font-size="17" font-weight="900" font-style="italic" fill="#111" letter-spacing=".5">CARSONEXPORTS<tspan font-size="13" font-weight="700" font-style="normal">.com</tspan></text>`}
  <ellipse cx="200" cy="${ty + 64 * scale + 4}" rx="${120 * scale}" ry="9" fill="url(#shadow)"/>
  <g transform="translate(${tx} ${ty}) scale(${scale})" fill="none" stroke="${ink}" stroke-width="${2.6 / scale}" stroke-linejoin="round" stroke-linecap="round">
    <path d="${p.body}" fill="#FFFFFF" fill-opacity=".55"/>
    ${p.windows.map(w => `<path d="${w}" fill="${accent}" fill-opacity=".12"/>`).join('')}
    ${p.extra ? `<path d="${p.extra}"/>` : ''}
    ${p.wheels.map(x => `<circle cx="${x}" cy="${p.ground}" r="${p.r}" fill="#fff"/><circle cx="${x}" cy="${p.ground}" r="${p.r * 0.4}"/>`).join('')}
  </g>
  ${compact ? '' : `
  <text x="200" y="${ty + 64 * scale + 40}" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-size="${nameSize}" font-weight="700" fill="${ink}">${name}</text>
  <g transform="translate(${200 - 92} ${ty + 64 * scale + 54})">
    <rect x="0" y="0" width="184" height="24" rx="12" fill="${accent}"/>
    <g transform="translate(14 6)" fill="none" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"><path d="M1,3 L4,3 L5.5,1 L10.5,1 L12,3 L15,3 L15,12 L1,12 Z"/><circle cx="8" cy="7.2" r="2.6"/></g>
    <text x="38" y="16" font-family="Helvetica, Arial, sans-serif" font-size="10.5" font-weight="700" fill="#fff" letter-spacing="1.1">PHOTOS COMING SOON</text>
  </g>`}
</svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
