-- NOTE: admin policies here use public.is_admin() — run migration-garage.sql FIRST (it defines the function and the admin_users table).
-- CarFinder: shopper vehicle requests + automatic match alerts
-- Run in the Supabase SQL Editor.

create table if not exists public.car_requests (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  email         text not null default '',
  phone         text not null default '',
  contact_pref  text not null default 'email' check (contact_pref in ('email', 'sms')),
  body          text not null default '',          -- '' = any
  make          text not null default '',
  model         text not null default '',
  year_min      int,
  price_max     int,
  mileage_max   int,
  fuel          text not null default '',
  drive         text not null default '',
  notes         text not null default '',
  active        boolean not null default true,
  notified_vehicle_ids jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now()
);

alter table public.car_requests enable row level security;

-- Shoppers can submit requests; only admins can read them (they contain contact info).
drop policy if exists "car requests public insert" on public.car_requests;
drop policy if exists "car requests admin all" on public.car_requests;
create policy "car requests public insert" on public.car_requests for insert with check (true);
create policy "car requests admin all" on public.car_requests for all
  using (public.is_admin()) with check (public.is_admin());

-- Alert delivery webhook (configured from Admin → CarFinder, no env var needed).
-- site_settings may not exist on databases where the full schema.sql was never
-- run (the site falls back to defaults), so create it here if missing.
create table if not exists public.site_settings (
  id              int primary key default 1,
  hero_mode       text not null default 'video',
  hero_video_url  text not null default 'https://www.youtube.com/watch?v=oPf6ktf4aHI',
  hero_image_url  text not null default '',
  hero_headline   text not null default 'Find the right car.',
  hero_subtext    text not null default 'Let Carson AI find your perfect match in 60 seconds.',
  hero_show_overlay boolean not null default true,
  hero_link_url   text not null default '',
  contact_address text not null default '550 Windmill Rd, Dartmouth, NS B3B 1B3',
  contact_phone   text not null default '(555) 234-9090',
  contact_email   text not null default 'hello@carsonexports.com',
  hours           jsonb not null default '[{"day":"Mon–Fri","time":"9 AM–7 PM"},{"day":"Saturday","time":"10 AM–6 PM"},{"day":"Sunday","time":"11 AM–5 PM"}]'::jsonb,
  updated_at      timestamptz not null default now(),
  constraint single_row check (id = 1)
);
insert into public.site_settings (id) values (1) on conflict (id) do nothing;
alter table public.site_settings enable row level security;
drop policy if exists "settings public read" on public.site_settings;
drop policy if exists "settings admin write" on public.site_settings;
create policy "settings public read"  on public.site_settings for select using (true);
create policy "settings admin write"  on public.site_settings for all using (public.is_admin()) with check (public.is_admin());

alter table public.site_settings add column if not exists alert_webhook_url text not null default '';

notify pgrst, 'reload schema';
