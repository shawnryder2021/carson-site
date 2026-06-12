-- Instagram grid (homepage + /social page)
-- Run in the Supabase SQL Editor (project sfxswebjrzzdqtuzfmvd).

alter table public.site_settings add column if not exists instagram_handle text not null default 'carsonexports';
alter table public.site_settings add column if not exists instagram_feed_url text not null default '';
alter table public.site_settings add column if not exists instagram_posts jsonb not null default '[]'::jsonb;

notify pgrst, 'reload schema';
