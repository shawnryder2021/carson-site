export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json({ reply: 'OpenRouter not configured. Set OPENROUTER_API_KEY.' }, { status: 503 });
  }

  const { prompt, model } = await req.json();
  if (!prompt) {
    return Response.json({ reply: 'No prompt provided.' }, { status: 400 });
  }

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
        model: model || 'openai/gpt-4o-mini',
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
