-- AI-generated marketing banner library (kie.ai / GPT Image 2)
-- Run in the Supabase SQL Editor (project sfxswebjrzzdqtuzfmvd).

alter table public.site_settings add column if not exists marketing_banners jsonb not null default '[]'::jsonb;

notify pgrst, 'reload schema';
