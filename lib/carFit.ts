// Shared AI helpers for the finder (/api/finder) and the compare explainer
// (/api/compare). Both work from the vehicle records we load on the server, so
// the model only ever sees real stock and a reply can only name cars we have.
import type { ServerVehicle } from './serverDb';
import { llmComplete } from './llm';

export type FinderAnswers = {
  useCase: string;
  budget: number;
  body: string;
  fuel: string;
  mustHaves: string[];
  notes: string;
};

export type FinderMatch = { id: string; fit: number; why: string; consider: string };
export type FinderResult = { intro: string; matches: FinderMatch[]; fallback: boolean };

const USE_CASES = ['commute', 'family', 'adventure', 'work', 'first', 'fun', ''];
const BODIES = ['No preference', 'SUV', 'Sedan', 'Truck', 'Coupe', 'Wagon'];
const FUELS = ['No preference', 'Gas', 'Hybrid', 'Electric'];
const MUST_HAVES = ['AWD / 4WD', 'Great MPG', 'Third row', 'Low mileage', 'Luxury feel', 'Tech & safety', 'Cargo space', 'Sporty'];

const money = (n: number) => `$${Math.round(n).toLocaleString('en-CA')}`;
const km = (n: number) => `${Math.round(n).toLocaleString('en-CA')} km`;

// Accept only values from our own lists, so nothing unexpected reaches the prompt.
export function cleanAnswers(raw: any): FinderAnswers {
  const pick = (v: any, allowed: string[], fallback: string) => (allowed.includes(v) ? v : fallback);
  const budget = Number(raw?.budget);
  return {
    useCase: pick(raw?.useCase, USE_CASES, ''),
    budget: Number.isFinite(budget) ? Math.min(Math.max(budget, 5000), 200000) : 35000,
    body: pick(raw?.body, BODIES, 'No preference'),
    fuel: pick(raw?.fuel, FUELS, 'No preference'),
    mustHaves: Array.isArray(raw?.mustHaves) ? raw.mustHaves.filter((m: any) => MUST_HAVES.includes(m)) : [],
    notes: typeof raw?.notes === 'string' ? raw.notes.slice(0, 1000) : '',
  };
}

// Free text from "describe your life" becomes the notes; the model infers the rest.
export function answersFromText(text: string): FinderAnswers {
  return { useCase: '', budget: 35000, body: 'No preference', fuel: 'No preference', mustHaves: [], notes: text.slice(0, 1000) };
}

function availableStock(inv: ServerVehicle[]) {
  return inv.filter(v => v.status === 'available');
}

function describeShopper(a: FinderAnswers, refine?: string) {
  return [
    `- Primary use: ${a.useCase || 'not stated'}`,
    `- Budget: about ${money(a.budget)}`,
    `- Body preference: ${a.body}`,
    `- Fuel preference: ${a.fuel}`,
    `- Must-haves: ${a.mustHaves.join(', ') || 'none stated'}`,
    `- In their own words: ${a.notes || 'nothing extra'}`,
    refine ? `- Refinement request: ${refine}` : '',
  ].filter(Boolean).join('\n');
}

const FINDER_SYSTEM = `You are Carson AI, a sharp, honest car-matching expert for Carson Exports, a used-car dealership in Dartmouth, Nova Scotia.
From the inventory list, pick the 3 best matches for this shopper and explain why each fits THEM. Use only the facts in the list: never invent features, history, warranty, prices, reliability or track-record claims.
Reply ONLY with JSON, no markdown, in this shape:
{"intro":"one warm sentence about what you looked for","matches":[{"id":"<id from the list>","fit":<integer 0-100>,"why":"two sentences on why this fits this shopper","consider":"one honest thing to consider"}]}
Exactly 3 matches, best first. Prefer cars near or under budget. If fewer than 3 fit, include the closest ones and say so in "consider".`;

// Pull the JSON object out of a reply even if the model added prose around it.
function parseJson(text: string): any | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)); } catch { return null; }
}

function localFallback(a: FinderAnswers, stock: ServerVehicle[]): FinderResult {
  const matches = stock
    .filter(v => v.price <= a.budget * 1.1)
    .filter(v => a.body === 'No preference' || v.body === a.body)
    .filter(v => a.fuel === 'No preference' || v.fuel === a.fuel)
    .slice(0, 3)
    .map((v, i) => ({ id: v.id, fit: 90 - i * 7, why: `A solid match for your ${a.useCase || 'needs'} within budget.`, consider: 'Book a test drive to confirm the fit.' }));
  return { intro: 'Here are a few that line up with what you told me.', matches, fallback: true };
}

export async function findMatches(answers: FinderAnswers, stockAll: ServerVehicle[], refine?: string): Promise<FinderResult> {
  const stock = availableStock(stockAll).slice(0, 250);
  if (stock.length === 0) return { intro: 'Nothing matches right now. Call us and we will look for you.', matches: [], fallback: true };
  const list = stock.map(v => `${v.id}: ${v.year} ${v.make} ${v.model}, ${money(v.price)}, ${km(v.mileage)}, ${v.body}, ${v.fuel}, ${v.drive}`).join('\n');
  try {
    const reply = await llmComplete({
      system: FINDER_SYSTEM,
      messages: [{ role: 'user', content: `Shopper:\n${describeShopper(answers, refine)}\n\nInventory:\n${list}` }],
      temperature: 0.5,
      maxTokens: 700,
    });
    const json = parseJson(reply);
    const ids = new Set(stock.map(v => v.id));
    const matches: FinderMatch[] = (Array.isArray(json?.matches) ? json.matches : [])
      .filter((m: any) => ids.has(m?.id))
      .slice(0, 3)
      .map((m: any) => ({
        id: m.id,
        fit: Math.min(100, Math.max(0, Math.round(Number(m.fit) || 0))),
        why: String(m.why || '').slice(0, 400),
        consider: String(m.consider || '').slice(0, 300),
      }));
    if (matches.length === 0) return localFallback(answers, stock);
    return { intro: String(json?.intro || '').slice(0, 300), matches, fallback: false };
  } catch (e: any) {
    console.error('Finder AI error:', e?.message || e);
    return localFallback(answers, stock);
  }
}

const COMPARE_SYSTEM = `You are Carson AI, an honest car advisor for Carson Exports in Dartmouth, Nova Scotia.
Explain the difference between the cars below in plain English for this shopper's situation.
Rules:
- Use only the facts given. Never invent reliability, safety ratings, fuel economy, features, size, space or prices, and never call one car bigger, roomier or safer than another unless the facts say so.
- Plain text only: no markdown, no headings, no bullet symbols, no bold.
- Under 130 words. First line: the best pick for their situation and why, in one sentence.
- Then one line per car starting with its year, make and model: when it is the better choice.
- Last line: one honest thing to check before buying (for example a test drive or inspection).`;

export function carFacts(v: ServerVehicle): string {
  const bits = [
    `${v.year} ${v.make} ${v.model}${v.trim ? ` ${v.trim}` : ''}`,
    money(v.price),
    km(v.mileage),
    v.body,
    v.fuel,
    v.drive,
    v.transmission ? `${v.transmission} transmission` : '',
    v.exterior ? `${v.exterior} exterior` : '',
    v.interior ? `${v.interior} interior` : '',
  ].filter(Boolean);
  return bits.join(', ');
}

export async function explainComparison(cars: ServerVehicle[], situation: string): Promise<string> {
  const facts = cars.map((v, i) => `Car ${i + 1}: ${carFacts(v)}`).join('\n');
  const who = situation.trim() ? `The shopper says: "${situation.trim()}"` : 'The shopper did not describe their situation, so give a general comparison.';
  return llmComplete({
    system: COMPARE_SYSTEM,
    messages: [{ role: 'user', content: `${who}\n\nCars:\n${facts}` }],
    temperature: 0.4,
    maxTokens: 320,
  });
}
