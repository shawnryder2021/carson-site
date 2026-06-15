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
    .select('chat_enabled, chat_timezone, chat_hours, chat_greeting, chat_offline_greeting, chat_agents, chat_takeover_seconds, alert_webhook_url')
    .eq('id', 1).maybeSingle();
  return {
    webhookUrl: data?.alert_webhook_url || process.env.ALERT_WEBHOOK_URL || '',
    enabled: data?.chat_enabled !== false,
    timezone: data?.chat_timezone || 'America/Halifax',
    hours: Array.isArray(data?.chat_hours) ? data!.chat_hours : DEFAULT_CHAT_HOURS,
    greeting: data?.chat_greeting || 'Hi! A Carson team member is here — how can we help?',
    offlineGreeting: data?.chat_offline_greeting || "I'm Carson AI — ask me anything and I'll help right now.",
    agents: Array.isArray(data?.chat_agents) ? data!.chat_agents.filter((a: any) => a?.active !== false && a?.phone) : [],
    takeoverSeconds: typeof data?.chat_takeover_seconds === 'number' ? data!.chat_takeover_seconds : 120,
  };
}

async function knowledgeContext(sb: SupabaseClient): Promise<string> {
  try {
    const { data } = await sb.from('ai_knowledge_base').select('category,title,content');
    if (!data || data.length === 0) return '';
    return '# Carson Exports knowledge base\n' + data.map((e: any) => `## ${e.title}\n${e.content}`).join('\n\n');
  } catch { return ''; }
}

type SuggestVehicle = { id: string; year: number; make: string; model: string; price: number; mileage: number; body: string; fuel: string; drive: string; images: string[]; status: string; hidden_override?: boolean };

// In-stock vehicles for the AI to reference (and for suggestion cards).
async function loadInventory(sb: SupabaseClient): Promise<SuggestVehicle[]> {
  try {
    const { data } = await sb.from('vehicles')
      .select('id, year, make, model, price, mileage, body, fuel, drive, images, status, hidden_override')
      .neq('status', 'sold').neq('status', 'hidden').limit(120);
    return (data || []).filter((v: any) => !v.hidden_override) as SuggestVehicle[];
  } catch { return []; }
}

function inventoryContext(inv: SuggestVehicle[]): string {
  if (inv.length === 0) return '';
  const lines = inv.slice(0, 60).map(v =>
    `- ${v.year} ${v.make} ${v.model} — $${v.price.toLocaleString()}, ${v.mileage.toLocaleString()}km, ${v.body}, ${v.fuel}, ${v.drive} — ${SITE_URL}/vehicle/${v.id}`);
  return `# Current inventory in stock (${inv.length} vehicles; only recommend from this list):\n${lines.join('\n')}`;
}

// Pick up to 3 relevant vehicles from the conversation text (for cards).
function suggestFromText(inv: SuggestVehicle[], text: string): SuggestVehicle[] {
  const t = text.toLowerCase();
  if (!t.trim()) return [];
  // Optional price ceiling from "$25k", "under 30000", "25,000"
  let priceMax = Infinity;
  const kMatch = t.match(/\$?\s?(\d{1,3})\s?k\b/);
  if (kMatch) priceMax = parseInt(kMatch[1]) * 1000;
  const nMatch = t.match(/(?:under|below|max|less than|budget|around)\D{0,8}\$?\s?(\d{2,3}[,.]?\d{3})/);
  if (nMatch) priceMax = Math.min(priceMax, parseInt(nMatch[1].replace(/[,.]/g, '')));

  const bodies = ['suv', 'sedan', 'truck', 'coupe', 'wagon', 'hatchback', 'van', 'minivan'];
  const fuels = ['hybrid', 'electric', 'ev', 'gas', 'diesel'];
  const drives = ['awd', '4wd', 'fwd', 'rwd', '4x4'];

  const scored = inv.map(v => {
    let score = 0;
    const make = v.make.toLowerCase(), model = v.model.toLowerCase();
    if (t.includes(make)) score += 3;
    if (model.length > 2 && t.includes(model)) score += 4;
    if (bodies.some(b => t.includes(b) && v.body.toLowerCase() === (b === 'minivan' || b === 'van' ? 'wagon' : b))) score += 3;
    if (fuels.some(f => t.includes(f) && (v.fuel.toLowerCase() === f || (f === 'ev' && v.fuel.toLowerCase() === 'electric')))) score += 2;
    if (drives.some(d => t.includes(d) && v.drive.toLowerCase() === (d === '4wd' || d === '4x4' ? 'awd' : d))) score += 1;
    if (/family|kids|space|room/.test(t) && v.body.toLowerCase() === 'suv') score += 2;
    if (/cheap|afford|budget|low/.test(t)) score += 0; // handled by price filter
    if (v.price <= priceMax) score += 1; else score -= 3;
    return { v, score };
  }).filter(x => x.score > 1).sort((a, b) => b.score - a.score || a.v.price - b.v.price);

  return scored.slice(0, 3).map(x => x.v);
}

async function aiReply(sb: SupabaseClient, history: { role: string; text: string }[], inv: SuggestVehicle[]): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return "I'm here to help! Leave your name and number and a team member will reach out shortly.";
  const kb = await knowledgeContext(sb);
  const openai = new OpenAI({ apiKey });
  const messages = [
    { role: 'system' as const, content:
      `You are Carson AI, the friendly assistant for Carson Exports, a family-run used-car dealership at 550 Windmill Rd, Dartmouth, NS. ` +
      `Help with vehicles, financing, trade-ins, service, and hours. Keep replies to 1-3 short sentences, warm and honest, never pushy. ` +
      `When a shopper describes what they want, recommend 1-3 specific vehicles ONLY from the inventory list below, mentioning the year/make/model and price, and include the vehicle link. ` +
      `Never invent vehicles or prices. If nothing fits, say so and offer to take their info for when something arrives. Site: ${SITE_URL}.\n\n${inventoryContext(inv)}\n\n${kb}` },
    ...history.slice(-10).map(m => ({ role: m.role === 'visitor' ? 'user' as const : 'assistant' as const, content: m.text })),
  ];
  try {
    const r = await openai.chat.completions.create({ model: process.env.OPENAI_MODEL || 'gpt-4o-mini', messages, temperature: 0.6, max_tokens: 320 });
    return r.choices[0]?.message?.content || "Sorry, I didn't catch that — could you rephrase?";
  } catch {
    return "I'm having trouble right now, but leave your contact and our team will follow up first thing.";
  }
}

async function fireWebhook(url: string, payload: any) {
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

      if (open && !convo.ai_active) {
        // Live mode, team still handling: notify them; they reply from the console.
        await fireWebhook(cfg.webhookUrl, {
          event: isFirst ? 'chat.new' : 'chat.message',
          at: new Date().toISOString(),
          conversationId,
          name: patch.name || convo.name || 'Website visitor',
          contact: patch.contact || convo.contact || '',
          text: text.trim(),
          agents: cfg.agents,  // [{name, phone}] for your Twilio flow to text
          url: `${SITE_URL}/admin/chat`,
        });
        return Response.json({ ok: true, mode: 'live' });
      }

      // After-hours OR AI has claimed the thread: AI answers immediately.
      const inv = await loadInventory(sb);
      const { data: hist } = await sb.from('chat_messages').select('role,text').eq('conversation_id', conversationId).order('created_at', { ascending: true });
      const reply = await aiReply(sb, (hist || []) as any, inv);
      await sb.from('chat_messages').insert({ conversation_id: conversationId, role: 'ai', text: reply });
      const visitorText = [...(hist || []).filter((m: any) => m.role === 'visitor').map((m: any) => m.text), text].join(' ');
      const suggestions = suggestFromText(inv, visitorText).map(v => ({ id: v.id, title: `${v.year} ${v.make} ${v.model}`, price: v.price, image: v.images?.[0] || '', url: `${SITE_URL}/vehicle/${v.id}` }));
      return Response.json({ ok: true, mode: 'ai', reply, suggestions });
    }

    // ── Poll for new messages (also drives AI auto-takeover) ──
    if (action === 'poll') {
      const { conversationId, token, since } = body;
      if (!conversationId || !token) return Response.json({ error: 'bad request' }, { status: 400 });
      const { data: convo } = await sb.from('chat_conversations').select('id, ai_active').eq('id', conversationId).eq('token', token).maybeSingle();
      if (!convo) return Response.json({ error: 'not found' }, { status: 404 });

      // AI takeover: during live hours, if the team never picked it up and the
      // latest message is a visitor message older than the configured delay,
      // AI claims the thread. Driven by the visitor's own polling — no cron.
      if (open && !convo.ai_active && cfg.takeoverSeconds > 0) {
        const { data: all } = await sb.from('chat_messages').select('role,text,created_at').eq('conversation_id', conversationId).order('created_at', { ascending: true });
        const msgs = all || [];
        const anyAgent = msgs.some((m: any) => m.role === 'agent');
        const last = msgs[msgs.length - 1];
        const waited = last ? (Date.now() - new Date(last.created_at).getTime()) / 1000 : 0;
        if (!anyAgent && last && last.role === 'visitor' && waited >= cfg.takeoverSeconds) {
          // Claim atomically so concurrent polls can't double-answer.
          const { data: claimed } = await sb.from('chat_conversations')
            .update({ ai_active: true }).eq('id', conversationId).eq('ai_active', false).select('id');
          if (claimed && claimed.length > 0) {
            const inv = await loadInventory(sb);
            const reply = await aiReply(sb, msgs as any, inv);
            await sb.from('chat_messages').insert({ conversation_id: conversationId, role: 'ai', text: reply });
            await fireWebhook(cfg.webhookUrl, { event: 'chat.ai_takeover', at: new Date().toISOString(), conversationId, url: `${SITE_URL}/admin/chat` });
          }
        }
      }

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
