// Text AI for chat, the public AI endpoint and vehicle descriptions:
// Claude Haiku 5.5, called directly (ANTHROPIC_API_KEY) or through OpenRouter
// (OPENROUTER_API_KEY), whichever is set. Images stay on kie.ai (lib/kie.ts),
// whose Claude endpoint is too slow (30-60 s) for request-time replies.

export type LlmMessage = { role: 'system' | 'user' | 'assistant'; content: string };

const ANTHROPIC_MODEL = 'claude-haiku-5-5';
const OPENROUTER_MODEL = 'anthropic/claude-haiku-5.5';
const TIMEOUT_MS = 20000; // under Netlify's ~26 s function limit

export function llmConfigured(): boolean {
  return !!(process.env.ANTHROPIC_API_KEY || process.env.OPENROUTER_API_KEY);
}

// Claude wants a separate system prompt and a conversation that starts with
// the user and alternates roles; chat history can start with our greeting or
// have two messages in a row from the same side.
function normalize(messages: LlmMessage[], system?: string) {
  const sys = [system, ...messages.filter(m => m.role === 'system').map(m => m.content)].filter(Boolean).join('\n\n');
  const turns: { role: 'user' | 'assistant'; content: string }[] = [];
  for (const m of messages) {
    if (m.role === 'system' || !m.content?.trim()) continue;
    const last = turns[turns.length - 1];
    if (last && last.role === m.role) last.content += '\n\n' + m.content;
    else turns.push({ role: m.role, content: m.content });
  }
  while (turns.length && turns[0].role !== 'user') turns.shift();
  return { system: sys, turns };
}

export async function llmComplete(opts: {
  messages: LlmMessage[]; system?: string; maxTokens?: number; temperature?: number;
}): Promise<string> {
  const { system, turns } = normalize(opts.messages, opts.system);
  if (!turns.length) throw new Error('No user message');
  const maxTokens = opts.maxTokens ?? 500;
  const temperature = opts.temperature ?? 0.7;
  const signal = AbortSignal.timeout(TIMEOUT_MS);

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST', signal,
      headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: ANTHROPIC_MODEL, max_tokens: maxTokens, temperature, ...(system ? { system } : {}), messages: turns }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    return (data.content || []).filter((c: any) => c.type === 'text').map((c: any) => c.text).join('').trim();
  }

  const openrouterKey = process.env.OPENROUTER_API_KEY;
  if (openrouterKey) {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST', signal,
      headers: {
        Authorization: `Bearer ${openrouterKey}`, 'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://carson-exports.shawnryder.com',
        'X-Title': 'Carson Exports',
      },
      body: JSON.stringify({
        model: OPENROUTER_MODEL, max_tokens: maxTokens, temperature,
        // Haiku 5.5 thinks by default on OpenRouter, which can spend the whole
        // token budget and return an empty reply; short answers don't need it.
        reasoning: { enabled: false },
        messages: [...(system ? [{ role: 'system', content: system }] : []), ...turns],
      }),
    });
    if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${(await res.text()).slice(0, 300)}`);
    const data = await res.json();
    return (data.choices?.[0]?.message?.content || '').trim();
  }

  throw new Error('No AI key set (ANTHROPIC_API_KEY or OPENROUTER_API_KEY)');
}
