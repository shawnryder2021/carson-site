// Google Sheet → inventory sync helpers.
// Parses a published CSV and maps rows to vehicle records, coercing values
// to the allowed enums so they pass the DB constraints.

import { AdminVehicle } from './db';

// Default sheet (can be overridden by INVENTORY_SHEET_URL env or an explicit url).
export const DEFAULT_SHEET_ID = '1gNiaM_TTswU8WmuP7O3Vdu_qj2ow1ZaUpHXulP1YUoI';

export function sheetCsvUrl(input?: string): string {
  const raw = (input || process.env.INVENTORY_SHEET_URL || DEFAULT_SHEET_ID).trim();
  // If a full published-CSV URL is given, use it as-is.
  if (/output=csv|format=csv/.test(raw)) return raw;
  // Extract an ID from a full edit URL, or use the raw as an ID.
  const m = raw.match(/\/d\/(?:e\/)?([a-zA-Z0-9_-]+)/);
  const id = m ? m[1] : raw;
  return `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`;
}

// ── CSV parsing (handles quoted fields, commas, newlines) ──
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c === '\r') { /* ignore */ }
      else field += c;
    }
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(c => c.trim() !== ''));
}

// ── Header matching ──
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
function findCol(headers: string[], candidates: string[]): number {
  const H = headers.map(norm);
  for (const cand of candidates) {
    const n = norm(cand);
    const exact = H.indexOf(n);
    if (exact !== -1) return exact;
  }
  for (const cand of candidates) {
    const n = norm(cand);
    const partial = H.findIndex(h => h.includes(n) && n.length >= 3);
    if (partial !== -1) return partial;
  }
  return -1;
}

// ── Value coercion to allowed enums ──
function coerceBody(v: string): AdminVehicle['body'] {
  const s = v.toLowerCase();
  if (/truck|pickup/.test(s)) return 'Truck';
  if (/coupe|convertible|roadster/.test(s)) return 'Coupe';
  if (/wagon|estate/.test(s)) return 'Wagon';
  if (/suv|crossover|cuv|van|minivan|jeep/.test(s)) return 'SUV';
  return 'Sedan';
}
function coerceFuel(v: string): AdminVehicle['fuel'] {
  const s = v.toLowerCase();
  if (/electric|^ev$|\bev\b|bev/.test(s)) return 'Electric';
  if (/hybrid|phev|plug/.test(s)) return 'Hybrid';
  return 'Gas';
}
function coerceDrive(v: string): AdminVehicle['drive'] {
  const s = v.toLowerCase();
  if (/awd|all.?wheel|4wd|4x4|four.?wheel/.test(s)) return 'AWD';
  if (/rwd|rear/.test(s)) return 'RWD';
  return 'FWD';
}
const toInt = (v: string) => parseInt((v || '').replace(/[^0-9.]/g, ''), 10) || 0;
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export type SheetParseResult = {
  vehicles: AdminVehicle[];
  warnings: string[];
  headers: string[];
};

export function parseSheetToVehicles(csv: string): SheetParseResult {
  const rows = parseCsv(csv);
  const warnings: string[] = [];
  if (rows.length < 2) return { vehicles: [], warnings: ['Sheet appears empty or has no data rows.'], headers: rows[0] || [] };

  const headers = rows[0];
  const col = {
    id: findCol(headers, ['id', 'stock', 'stock #', 'stocknumber', 'vin']),
    vin: findCol(headers, ['vin']),
    year: findCol(headers, ['year', 'yr']),
    make: findCol(headers, ['make', 'brand']),
    model: findCol(headers, ['model']),
    trim: findCol(headers, ['trim']),
    price: findCol(headers, ['price', 'asking', 'sale price', 'cost']),
    mileage: findCol(headers, ['mileage', 'miles', 'odometer', 'kms', 'km']),
    body: findCol(headers, ['body', 'body style', 'type', 'category', 'bodytype']),
    fuel: findCol(headers, ['fuel', 'fuel type', 'engine', 'powertrain']),
    drive: findCol(headers, ['drive', 'drivetrain', 'drive type', 'driveline']),
    exterior: findCol(headers, ['exterior', 'ext color', 'color', 'colour', 'exterior color']),
    interior: findCol(headers, ['interior', 'int color', 'interior color']),
    summary: findCol(headers, ['summary', 'description', 'notes', 'comments', 'details']),
    images: findCol(headers, ['images', 'image', 'photos', 'photo', 'image url', 'image urls', 'pictures']),
    status: findCol(headers, ['status', 'availability']),
  };

  if (col.year === -1 || col.make === -1 || col.model === -1) {
    warnings.push(`Couldn't find Year/Make/Model columns. Found headers: ${headers.join(', ')}`);
  }

  const get = (row: string[], idx: number) => (idx >= 0 && idx < row.length ? (row[idx] || '').trim() : '');

  const vehicles: AdminVehicle[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const year = toInt(get(row, col.year));
    const make = get(row, col.make);
    const model = get(row, col.model);
    if (!make || !model) continue; // skip incomplete rows

    const rawId = get(row, col.id) || get(row, col.vin);
    const id = rawId ? `cx-${slug(rawId)}` : `cx-${slug(`${year}-${make}-${model}-${r}`)}`;

    const imagesRaw = get(row, col.images);
    const images = imagesRaw ? imagesRaw.split(/[\s,;|]+/).filter(u => /^https?:\/\//.test(u)) : [];

    const statusRaw = get(row, col.status).toLowerCase();
    const status = /sold/.test(statusRaw) ? 'sold' : /hidden|draft|pending/.test(statusRaw) ? 'hidden' : 'available';

    vehicles.push({
      id,
      year: year || new Date().getFullYear(),
      make, model,
      price: toInt(get(row, col.price)),
      mileage: toInt(get(row, col.mileage)),
      body: coerceBody(get(row, col.body)),
      fuel: coerceFuel(get(row, col.fuel)),
      drive: coerceDrive(get(row, col.drive)),
      exterior: get(row, col.exterior),
      interior: get(row, col.interior),
      aiSummary: get(row, col.summary) || `${year} ${make} ${model}`.trim(),
      images,
      status,
      featured: false,
    });
  }

  if (vehicles.length === 0) warnings.push('No valid vehicle rows found (need at least Make + Model per row).');
  return { vehicles, warnings, headers };
}
