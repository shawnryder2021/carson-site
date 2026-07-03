import { OpenAI } from 'openai';
import { rateLimit } from '@/lib/ratelimit';

// Never statically evaluate this route at build time.
export const dynamic = 'force-dynamic';

// Public AI endpoint (car finder, trade-in, concierge, etc.). Caps protect
// against runaway loops burning OpenAI credit; the model is fixed server-side.
const MAX_PROMPT = 8000;      // chars in a single-prompt request
const MAX_MESSAGES = 20;      // conversation turns
const MAX_MESSAGES_CHARS = 16000; // total chars across messages

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({ reply: 'AI is not configured. Set OPENAI_API_KEY.' }, { status: 503 });
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

  // Instantiate lazily, inside the handler — so a missing key doesn't break the build.
  const openai = new OpenAI({ apiKey });

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: messages || [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 500,
    });

    const reply = response.choices[0]?.message?.content || 'I couldn\'t generate a response.';
    return Response.json({ reply });
  } catch (error: any) {
    console.error('OpenAI error:', error);
    return Response.json({ reply: 'Error communicating with AI.' }, { status: 500 });
  }
}
