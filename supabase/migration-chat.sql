-- Live + AI chat. Run in the Supabase SQL Editor (project sfxswebjrzzdqtuzfmvd).

create table if not exists public.chat_conversations (
  id            uuid primary key default gen_random_uuid(),
  token         uuid not null default gen_random_uuid(),  -- visitor secret to read its own thread
  name          text not null default '',
  contact       text not null default '',
  mode          text not null default 'ai',               -- 'live' | 'ai' (at creation)
  status        text not null default 'open',             -- 'open' | 'closed'
  agent_unread  boolean not null default true,            -- new visitor msg the team hasn't seen
  created_at    timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  role            text not null check (role in ('visitor','agent','ai','system')),
  text            text not null,
  created_at      timestamptz not null default now()
);
create index if not exists idx_chat_msgs_convo on public.chat_messages(conversation_id, created_at);

-- Admin (authenticated) can read/manage everything. Visitors go through the
-- server /api/chat route (service role), so no public policies are needed.
alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;
drop policy if exists "chat convo admin" on public.chat_conversations;
drop policy if exists "chat msg admin" on public.chat_messages;
create policy "chat convo admin" on public.chat_conversations for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
create policy "chat msg admin"   on public.chat_messages for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Chat config on site_settings
alter table public.site_settings add column if not exists chat_enabled boolean not null default true;
alter table public.site_settings add column if not exists chat_timezone text not null default 'America/Halifax';
alter table public.site_settings add column if not exists chat_hours jsonb not null default
  '[{"open":"11:00","close":"17:00"},{"open":"09:00","close":"19:00"},{"open":"09:00","close":"19:00"},{"open":"09:00","close":"19:00"},{"open":"09:00","close":"19:00"},{"open":"09:00","close":"19:00"},{"open":"10:00","close":"18:00"}]'::jsonb;
alter table public.site_settings add column if not exists chat_greeting text not null default 'Hi! 👋 A Carson team member is here — how can we help you find your next vehicle?';
alter table public.site_settings add column if not exists chat_offline_greeting text not null default 'Thanks for stopping by after hours! I''m Carson AI — ask me anything and I''ll help right now. Leave your contact and a team member will follow up in the morning.';

notify pgrst, 'reload schema';
