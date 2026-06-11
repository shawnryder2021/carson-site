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
