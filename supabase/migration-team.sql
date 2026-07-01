-- NOTE: admin policies here use public.is_admin() — run migration-garage.sql FIRST (it defines the function and the admin_users table).
-- Run in the Supabase SQL Editor.
-- Team members for the /team page.

create table if not exists public.team_members (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  role        text not null default '',
  photo_url   text not null default '',
  video_url   text not null default '',
  bio         text not null default '',
  fun_facts   jsonb not null default '[]'::jsonb,
  specialties jsonb not null default '[]'::jsonb,
  email       text not null default '',
  phone       text not null default '',
  active      boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.team_members enable row level security;
drop policy if exists "team public read" on public.team_members;
drop policy if exists "team admin write" on public.team_members;
create policy "team public read"  on public.team_members for select using (true);
create policy "team admin write"  on public.team_members for all using (public.is_admin()) with check (public.is_admin());

notify pgrst, 'reload schema';
