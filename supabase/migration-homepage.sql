-- Homepage section on/off toggles
-- Run in the Supabase SQL Editor (project sfxswebjrzzdqtuzfmvd).

alter table public.site_settings add column if not exists homepage_sections jsonb not null default '{}'::jsonb;

notify pgrst, 'reload schema';
