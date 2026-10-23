import { rateLimit } from '@/lib/ratelimit';
import { llmComplete, llmConfigured } from '@/lib/llm';

// Never statically evaluate this route at build time.
export const dynamic = 'force-dynamic';

// Public AI endpoint (car finder, trade-in, concierge, etc.). Caps protect
// against runaway loops burning AI credit; the model is fixed server-side (lib/llm.ts).
const MAX_PROMPT = 8000;      // chars in a single-prompt request
const MAX_MESSAGES = 20;      // conversation turns
const MAX_MESSAGES_CHARS = 16000; // total chars across messages

export async function POST(req: Request) {
  if (!llmConfigured()) {
    return Response.json({ reply: 'AI is not configured. Set OPENROUTER_API_KEY.' }, { status: 503 });
  }

  // 30 requests / minute per IP (generous for real use, stops abuse loops).
  if (!(await rateLimit(req, 'ai', 30, 60))) {
    return Response.json({ reply: 'Too many requests — please wait a moment and try again.' }, { status: 429 });
  }

  const { prompt, messages } = await req.json();

  // Validate + cap input size.
  if (Array.isArray(messages)) {
    if (messages.length > MAX_MESSAGES) {
      return Response.json({ reply: 'Conversation too long.' }, { status: 400 });
    }
    const totalChars = messages.reduce((n: number, m: any) => n + (typeof m?.content === 'string' ? m.content.length : 0), 0);
    if (totalChars > MAX_MESSAGES_CHARS) {
      return Response.json({ reply: 'Message too long.' }, { status: 400 });
    }
  } else if (typeof prompt === 'string') {
    if (prompt.length > MAX_PROMPT) {
      return Response.json({ reply: 'Message too long.' }, { status: 400 });
    }
  } else {
    return Response.json({ reply: 'No prompt provided.' }, { status: 400 });
  }

  try {
    const reply = await llmComplete({
      messages: Array.isArray(messages) ? messages : [{ role: 'user', content: prompt }],
      temperature: 0.7,
      maxTokens: 500,
    });
    return Response.json({ reply: reply || 'I couldn\'t generate a response.' });
  } catch (error: any) {
    console.error('AI error:', error?.message || error);
    return Response.json({ reply: 'Error communicating with AI.' }, { status: 500 });
  }
}
