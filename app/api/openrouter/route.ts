import { requireAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

// Admin-only model testing for AI descriptions. Gated because it forwards a
// caller-chosen model to OpenRouter — an open version would let anyone bill the
// owner for premium models. The allowlist mirrors the admin VehicleForm picker.
const ALLOWED_MODELS = new Set([
  'openai/gpt-4o-mini', 'openai/gpt-4o', 'openai/gpt-4.1', 'openai/gpt-4.1-mini', 'openai/gpt-4.1-nano',
  'anthropic/claude-opus-4', 'anthropic/claude-sonnet-4', 'anthropic/claude-haiku-4', 'anthropic/claude-3.5-haiku',
  'google/gemini-2.5-flash', 'google/gemini-2.5-pro',
  'meta-llama/llama-4-maverick', 'meta-llama/llama-4-scout', 'meta-llama/llama-3.3-70b-instruct',
  'deepseek/deepseek-chat-v3-0324', 'deepseek/deepseek-r1',
  'mistralai/mistral-large-2', 'mistralai/mistral-small-3.2',
  'qwen/qwen3-235b-a22b', 'qwen/qwen3-32b',
  'x-ai/grok-3-mini', 'cohere/command-a', 'amazon/nova-pro-v1',
]);
const DEFAULT_MODEL = 'openai/gpt-4o-mini';
const MAX_PROMPT = 4000;

export async function POST(req: Request) {
  if (!(await requireAdmin(req))) {
    return Response.json({ reply: 'Unauthorized.' }, { status: 401 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json({ reply: 'OpenRouter not configured. Set OPENROUTER_API_KEY.' }, { status: 503 });
  }

  const { prompt, model } = await req.json();
  if (!prompt || typeof prompt !== 'string') {
    return Response.json({ reply: 'No prompt provided.' }, { status: 400 });
  }
  if (prompt.length > MAX_PROMPT) {
    return Response.json({ reply: 'Prompt too long.' }, { status: 400 });
  }
  const chosen = model && ALLOWED_MODELS.has(model) ? model : DEFAULT_MODEL;

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'https://carsonsite.netlify.app',
        'X-Title': 'Carson Exports',
      },
      body: JSON.stringify({
        model: chosen,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('OpenRouter error:', res.status, err);
      return Response.json({ reply: `OpenRouter error (${res.status}).` }, { status: 502 });
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content || 'No response generated.';
    return Response.json({ reply, model: data.model });
  } catch (error: any) {
    console.error('OpenRouter fetch error:', error);
    return Response.json({ reply: 'Error communicating with OpenRouter.' }, { status: 500 });
  }
}
