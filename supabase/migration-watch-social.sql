-- Watch-this-car alerts + social proof (deal of the week)
-- Run in the Supabase SQL Editor (project sfxswebjrzzdqtuzfmvd!).

create table if not exists public.vehicle_watches (
  id            uuid primary key default gen_random_uuid(),
  vehicle_id    text not null references public.vehicles(id) on delete cascade,
  name          text not null default '',
  email         text not null default '',
  phone         text not null default '',
  contact_pref  text not null default 'email' check (contact_pref in ('email', 'sms')),
  -- price at signup / last alert; we alert when current price falls below it
  last_notified_price int not null,
  active        boolean not null default true,
  created_at    timestamptz not null default now()
);
create index if not exists idx_watches_vehicle on public.vehicle_watches(vehicle_id);

alter table public.vehicle_watches enable row level security;
drop policy if exists "watches public insert" on public.vehicle_watches;
drop policy if exists "watches admin all" on public.vehicle_watches;
create policy "watches public insert" on public.vehicle_watches for insert with check (true);
create policy "watches admin all" on public.vehicle_watches for all
  using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

-- Deal of the week: admin-picked vehicle highlighted on the homepage
alter table public.site_settings add column if not exists deal_vehicle_id text not null default '';

notify pgrst, 'reload schema';
