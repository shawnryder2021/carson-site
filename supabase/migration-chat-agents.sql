-- Chat agent roster + AI auto-takeover. Run in the Supabase SQL Editor.

-- Per-conversation flag: has AI claimed this thread (team didn't reply in time)?
alter table public.chat_conversations add column if not exists ai_active boolean not null default false;

-- Settings: who does chat (texted via your Twilio webhook) + takeover delay.
alter table public.site_settings add column if not exists chat_agents jsonb not null default '[]'::jsonb;
alter table public.site_settings add column if not exists chat_takeover_seconds int not null default 120;

notify pgrst, 'reload schema';
