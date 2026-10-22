-- Run in the Supabase SQL Editor (after migration-garage.sql, which defines public.is_admin()).
-- Adds: a log of every applied inventory sync (scheduled or admin-run), shown in Admin → Inventory sync.

create table if not exists public.sync_runs (
  id           uuid primary key default gen_random_uuid(),
  source       text not null default 'sm360',
  trigger      text not null check (trigger in ('scheduled', 'admin')),
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  ok           boolean not null default false,
  fetched      int not null default 0,
  added        int not null default 0,
  updated      int not null default 0,
  marked_sold  int not null default 0,
  unchanged    int not null default 0,
  error        text,
  details      jsonb not null default '{}'::jsonb  -- { added: [...], updated: [...], sold: [...], errors: [...] }
);
create index if not exists sync_runs_started_idx on public.sync_runs (started_at desc);

-- Admins can read; only the server (service role, which bypasses RLS) writes.
alter table public.sync_runs enable row level security;
drop policy if exists "sync runs admin read" on public.sync_runs;
create policy "sync runs admin read" on public.sync_runs for select using (public.is_admin());
