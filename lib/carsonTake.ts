// "Carson's take": a short original description per vehicle. The SM360
// description is also syndicated to AutoTrader / CarGurus and was on the old
// site, so vehicle pages need text of their own. Written by Claude (lib/llm.ts) strictly
// from the car's own record — no invented history, warranty or pricing claims.
import { llmComplete } from './llm';
import type { SupabaseClient } from '@supabase/supabase-js';
import { displayTrim, htmlToText } from './sm360';

type VehicleRow = {
  id: string; year: number; make: string; model: string; trim?: string | null; body: string; fuel: string; drive: string;
  transmission?: string | null; mileage: number; exterior?: string | null; interior?: string | null; ai_summary?: string | null;
};

// Feature details from the dealer description, minus contact/financing boilerplate.
function featureNotes(desc: string): string {
  return htmlToText(desc || '')
    .split(/(?<=[.!?])\s+|\n+/)
    .filter(s => s.trim() && !/carson exports|call|visit us|financ|contact|dealership|\bwe\b|\bour\b|\d{3}[-.\s]\d{3}[-.\s]\d{4}/i.test(s))
    .join(' ')
    .slice(0, 1500);
}

// Rotate opening styles per car so 120+ descriptions don't all start alike.
const OPENINGS = [
  'Open with who this vehicle suits best.',
  'Open with its single most distinctive feature from the list.',
  'Open with what the drivetrain and body style are good at.',
  'Open with the interior and comfort.',
  'Open with a typical day or trip it handles well.',
  'Open with the engine or efficiency.',
];
const openingFor = (id: string) => OPENINGS[Array.from(id).reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % OPENINGS.length];

export function takePrompt(v: VehicleRow): string {
  const name = [v.year, v.make, v.model, displayTrim(v.trim)].filter(Boolean).join(' ');
  const facts = [
    `Vehicle: ${name}`,
    `Body category: ${v.body} (our site files minivans under SUV — if this is a minivan, call it a minivan)`,
    `Drivetrain: ${v.drive}`,
    v.transmission ? `Transmission: ${v.transmission}` : '',
    `Fuel: ${v.fuel}`,
    `Odometer: ${v.mileage.toLocaleString('en-CA')} km`,
    v.exterior ? `Exterior colour: ${v.exterior}` : '',
    v.interior ? `Interior colour: ${v.interior}` : '',
  ].filter(Boolean).join('\n');
  return `Write a short, original description of this used vehicle for its listing page at Carson Exports, a used car dealership in Dartmouth, Nova Scotia.

Facts (use only these):
${facts}

Features mentioned by the dealer (use only what is relevant; don't copy sentences):
${featureNotes(v.ai_summary || '') || '(none)'}

Rules:
- Two short paragraphs, 70 to 110 words total, plain text, Canadian English.
- Paragraph 1: who this vehicle suits and what stands out, using the facts and features. ${openingFor(v.id)} Never start with "The [vehicle] is" or "Experience", and avoid stock phrases like "ideal choice", "perfect for" and "blend of".
- Paragraph 2: practical ownership notes for Nova Scotia driving (e.g. winter traction if AWD/4x4, commuting economy if efficient), without overstating.
- Do NOT mention price, payments, warranty, inspection, accident or ownership history, CarFax, or anything not in the facts.
- No superlatives you can't support, no exclamation marks, no headings, no lists, no sign-off.`;
}

export async function writeTake(v: VehicleRow): Promise<string> {
  const text = await llmComplete({ messages: [{ role: 'user', content: takePrompt(v) }], temperature: 0.6, maxTokens: 300 });
  return text.replace(/^["']|["']$/g, '');
}

// Fill in missing takes for cars for sale, a few at a time (called after each
// inventory sync and from /api/vehicle-takes). Best-effort: failures are skipped.
export async function generateMissingTakes(sb: SupabaseClient, limit = 12): Promise<{ written: number; failed: number; remaining: number }> {
  const { data } = await sb.from('vehicles')
    .select('id, year, make, model, trim, body, fuel, drive, transmission, mileage, exterior, interior, ai_summary')
    .eq('status', 'available').is('carson_take', null).limit(200);
  const todo = (data || []) as VehicleRow[];
  let written = 0, failed = 0;
  const batch = todo.slice(0, limit);
  for (let i = 0; i < batch.length; i += 4) {
    await Promise.all(batch.slice(i, i + 4).map(async v => {
      try {
        const take = await writeTake(v);
        if (take.length < 80) { failed++; return; }
        const { error } = await sb.from('vehicles').update({ carson_take: take }).eq('id', v.id);
        if (error) failed++; else written++;
      } catch { failed++; }
    }));
  }
  return { written, failed, remaining: Math.max(0, todo.length - written) };
}
