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
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

notify pgrst, 'reload schema';
