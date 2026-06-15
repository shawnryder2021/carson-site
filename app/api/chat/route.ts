import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';
import { SUPABASE_URL } from '@/lib/supabase/config';
import { isChatOpen, DEFAULT_CHAT_HOURS } from '@/lib/chatHours';
import { SITE_URL } from '@/lib/serverDb';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// Service-role client (bypasses RLS). Chat needs it because anonymous visitors
// must read their own thread without exposing everyone else's.
function admin(): SupabaseClient | null {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false } });
}

async function getChatConfig(sb: SupabaseClient) {
  const { data } = await sb.from('site_settings')
    .select('chat_enabled, chat_timezone, chat_hours, chat_greeting, chat_offline_greeting')
    .eq('id', 1).maybeSingle();
  return {
    enabled: data?.chat_enabled !== false,
    timezone: data?.chat_timezone || 'America/Halifax',
    hours: Array.isArray(data?.chat_hours) ? data!.chat_hours : DEFAULT_CHAT_HOURS,
    greeting: data?.chat_greeting || 'Hi! A Carson team member is here — how can we help?',
    offlineGreeting: data?.chat_offline_greeting || "I'm Carson AI — ask me anything and I'll help right now.",
  };
}

async function knowledgeContext(sb: SupabaseClient): Promise<string> {
  try {
    const { data } = await sb.from('ai_knowledge_base').select('category,title,content');
    if (!data || data.length === 0) return '';
    return '# Carson Exports knowledge base\n' + data.map((e: any) => `## ${e.title}\n${e.content}`).join('\n\n');
  } catch { return ''; }
}

async function aiReply(sb: SupabaseClient, history: { role: string; text: string }[]): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return "I'm here to help! Leave your name and number and a team member will reach out shortly.";
  const kb = await knowledgeContext(sb);
  const openai = new OpenAI({ apiKey });
  const messages = [
    { role: 'system' as const, content:
      `You are Carson AI, the friendly after-hours assistant for Carson Exports, a family-run used-car dealership at 550 Windmill Rd, Dartmouth, NS. ` +
      `Help with vehicles, financing, trade-ins, service, and hours. Keep replies to 1-3 short sentences, warm and honest, never pushy. ` +
      `If you don't know something specific, offer to have a team member follow up and ask for their name + contact. Site: ${SITE_URL}.\n\n${kb}` },
    ...history.slice(-10).map(m => ({ role: m.role === 'visitor' ? 'user' as const : 'assistant' as const, content: m.text })),
  ];
  try {
    const r = await openai.chat.completions.create({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', messages, temperature: 0.6, max_tokens: 300 });
    return r.choices[0]?.message?.content || "Sorry, I didn't catch that — could you rephrase?";
  } catch {
    return "I'm having trouble right now, but leave your contact and our team will follow up first thing.";
  }
}

async function fireWebhook(payload: any) {
  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url) return;
  try { await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); } catch { /* best effort */ }
}

export async function POST(req: Request) {
  const sb = admin();
  if (!sb) return Response.json({ error: 'not_configured' }, { status: 503 });

  let body: any = {};
  try { body = await req.json(); } catch { /* */ }
  const action = body.action;

  try {
    const cfg = await getChatConfig(sb);
    const open = cfg.enabled && isChatOpen(cfg.hours, cfg.timezone);

    // ── Start a conversation ──
    if (action === 'start') {
      const mode = open ? 'live' : 'ai';
      const { data, error } = await sb.from('chat_conversations').insert({ mode }).select('id, token').single();
      if (error || !data) return Response.json({ error: error?.message || 'could not start' }, { status: 500 });
      const greeting = open ? cfg.greeting : cfg.offlineGreeting;
      await sb.from('chat_messages').insert({ conversation_id: data.id, role: open ? 'system' : 'ai', text: greeting });
      return Response.json({ conversationId: data.id, token: data.token, mode, open, greeting });
    }

    // ── Visitor sends a message ──
    if (action === 'send') {
      const { conversationId, token, text, name, contact } = body;
      if (!conversationId || !token || !text?.trim()) return Response.json({ error: 'bad request' }, { status: 400 });
      const { data: convo } = await sb.from('chat_conversations').select('*').eq('id', conversationId).eq('token', token).maybeSingle();
      if (!convo) return Response.json({ error: 'not found' }, { status: 404 });

      // Is this the visitor's first message? (drives a distinct "new chat" alert)
      const { count: priorVisitorMsgs } = await sb.from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conversationId).eq('role', 'visitor');
      const isFirst = (priorVisitorMsgs || 0) === 0;

      const patch: any = { agent_unread: true, last_message_at: new Date().toISOString() };
      if (name && !convo.name) patch.name = name;
      if (contact && !convo.contact) patch.contact = contact;
      await sb.from('chat_conversations').update(patch).eq('id', conversationId);
      await sb.from('chat_messages').insert({ conversation_id: conversationId, role: 'visitor', text: text.trim() });

      if (open) {
        // Live mode: notify the team; agent replies from the admin console.
        await fireWebhook({
          event: isFirst ? 'chat.new' : 'chat.message',
          at: new Date().toISOString(),
          conversationId,
          name: patch.name || convo.name || 'Website visitor',
          contact: patch.contact || convo.contact || '',
          text: text.trim(),
          url: `${SITE_URL}/admin/chat`,
        });
        return Response.json({ ok: true, mode: 'live' });
      }

      // After-hours: AI answers immediately.
      const { data: hist } = await sb.from('chat_messages').select('role,text').eq('conversation_id', conversationId).order('created_at', { ascending: true });
      const reply = await aiReply(sb, (hist || []) as any);
      await sb.from('chat_messages').insert({ conversation_id: conversationId, role: 'ai', text: reply });
      return Response.json({ ok: true, mode: 'ai', reply });
    }

    // ── Poll for new messages ──
    if (action === 'poll') {
      const { conversationId, token, since } = body;
      if (!conversationId || !token) return Response.json({ error: 'bad request' }, { status: 400 });
      const { data: convo } = await sb.from('chat_conversations').select('id').eq('id', conversationId).eq('token', token).maybeSingle();
      if (!convo) return Response.json({ error: 'not found' }, { status: 404 });
      let q = sb.from('chat_messages').select('role,text,created_at').eq('conversation_id', conversationId).order('created_at', { ascending: true });
      if (since) q = q.gt('created_at', since);
      const { data } = await q;
      return Response.json({ messages: data || [] });
    }

    return Response.json({ error: 'unknown action' }, { status: 400 });
  } catch (e: any) {
    return Response.json({ error: e?.message || 'chat failed' }, { status: 500 });
  }
}
