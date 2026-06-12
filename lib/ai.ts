export async function complete(promptOrOptions: string | { messages: any[] }): Promise<string> {
  const body = typeof promptOrOptions === 'string'
    ? { prompt: promptOrOptions }
    : { messages: promptOrOptions.messages };

  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return data.reply;
}

// Prompt for writing a vehicle listing description from its specs.
// Used by the admin "Write with AI" button and the bulk filler.
export function generateDescriptionPrompt(v: {
  year: number; make: string; model: string; mileage?: number;
  body?: string; fuel?: string; drive?: string; exterior?: string; interior?: string;
}): string {
  return `Write a vehicle listing description for a used-car dealership website.

Vehicle: ${v.year} ${v.make} ${v.model}
Mileage: ${v.mileage ? v.mileage.toLocaleString() + ' km' : 'unknown'}
Body: ${v.body || 'unknown'} · Fuel: ${v.fuel || 'unknown'} · Drive: ${v.drive || 'unknown'}
Exterior: ${v.exterior || 'unknown'} · Interior: ${v.interior || 'unknown'}

Rules:
- Exactly 2 sentences, 25-40 words total.
- Honest dealer tone: warm and confident, never hypey. No exclamation marks.
- Mention who it suits (commuters, families, etc.) based on the body/fuel type.
- Plain text only, no quotes, no markdown.`;
}
