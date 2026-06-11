import { Vehicle } from './inventory';

const colors: Record<string, string> = {
  'Pearl White': '#f5f5f5', 'White': '#ffffff', 'Silver': '#e8e8e8', 'Black': '#1a1a1a',
  'Blue': '#0066cc', 'Red': '#cc0000', 'Green': '#006600', 'Sage Green': '#6b8e6b',
  'Yellow': '#ffcc00', 'Gray': '#999999', 'Tan': '#c9a961',
};

const silhouettes: Record<string, string> = {
  Sedan: 'M30,80 Q10,40 30,30 Q50,40 70,30 Q90,40 70,80 Z',
  SUV: 'M25,85 Q10,50 25,30 Q50,20 75,30 Q90,50 75,85 Z',
  Truck: 'M20,85 L35,50 L55,45 L75,50 L80,85 Z',
  Coupe: 'M35,80 Q15,50 35,25 Q55,30 65,40 Q70,60 55,80 Z',
  Wagon: 'M20,80 Q10,45 25,30 Q50,25 75,30 Q85,45 80,80 Z',
};

export function vehicleImageURL(vehicle: Vehicle, opts?: { size?: number }): string {
  const size = opts?.size || 200;
  const color = colors[vehicle.exterior] || '#007c92';
  const silhouette = silhouettes[vehicle.body] || silhouettes.Sedan;

  const svg = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="shadow" cx="50%" cy="100%"><stop offset="0%" style="stop-color:black;stop-opacity:0.15"/><stop offset="100%" style="stop-color:black;stop-opacity:0"/></radialGradient>
      <radialGradient id="glow" cx="50%" cy="50%"><stop offset="0%" style="stop-color:#007c92;stop-opacity:0.3"/><stop offset="100%" style="stop-color:#007c92;stop-opacity:0"/></radialGradient>
    </defs>
    <ellipse cx="50" cy="92" rx="45" ry="6" fill="url(#shadow)"/>
    <circle cx="50" cy="50" r="48" fill="url(#glow)" opacity="0.4"/>
    <path d="${silhouette}" fill="${color}" stroke="#333" stroke-width="0.5"/>
  </svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
