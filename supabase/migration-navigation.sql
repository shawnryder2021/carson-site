-- Run this in the Supabase SQL Editor to add the admin-editable navigation.
create table if not exists public.nav_items (
  id          uuid primary key default gen_random_uuid(),
  label       text not null,
  href        text not null default '#',
  parent_id   uuid references public.nav_items(id) on delete cascade,
  sort_order  int not null default 0,
  auto_categories boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table public.nav_items enable row level security;

drop policy if exists "nav public read" on public.nav_items;
drop policy if exists "nav admin write" on public.nav_items;
create policy "nav public read"  on public.nav_items for select using (true);
create policy "nav admin write"  on public.nav_items for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
