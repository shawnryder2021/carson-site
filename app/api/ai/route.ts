import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
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
