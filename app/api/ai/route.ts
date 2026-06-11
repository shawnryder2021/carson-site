import { OpenAI } from 'openai';

// Never statically evaluate this route at build time.
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json({ reply: 'AI is not configured. Set OPENAI_API_KEY.' }, { status: 503 });
  }

  // Instantiate lazily, inside the handler — so a missing key doesn't break the build.
  const openai = new OpenAI({ apiKey });

  const { prompt, messages } = await req.json();

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
