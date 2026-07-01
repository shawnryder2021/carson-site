-- ============================================================
--  My Garage: customer accounts + admin/customer separation
--  Run in the Supabase SQL Editor BEFORE deploying the garage UI.
--
--  ⚠️  SECURITY-CRITICAL. Until this runs, every RLS policy treats
--  ANY authenticated session as an admin. Once customers can sign
--  up, they would be able to edit vehicles and read all leads/chats.
--  This migration introduces a real admin list and rewrites every
--  admin policy to use it.
--
--  Pre-flight: run  select id, email from auth.users;  and confirm
--  every account listed is a dealership admin — they will all be
--  seeded into admin_users below.
-- ============================================================

-- ---------- 1. Admin identity ----------
create table if not exists public.admin_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;

-- Users may check only their own membership (used by middleware).
-- No insert/update/delete policies: admin management happens here in
-- the SQL editor, never through the API.
drop policy if exists "admin_users self read" on public.admin_users;
create policy "admin_users self read" on public.admin_users
  for select using (auth.uid() = user_id);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

-- SEED — must run BEFORE the policy rewrites below. Safe because today
-- the only accounts in auth.users are dealership admins.
insert into public.admin_users (user_id)
select id from auth.users
on conflict do nothing;

-- ---------- 2. Rewrite every admin policy: authenticated → is_admin() ----------
-- schema.sql policies
drop policy if exists "nav admin write" on public.nav_items;
create policy "nav admin write" on public.nav_items for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "vehicles admin write" on public.vehicles;
create policy "vehicles admin write" on public.vehicles for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "settings admin write" on public.site_settings;
create policy "settings admin write" on public.site_settings for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "guides admin write" on public.guides;
create policy "guides admin write" on public.guides for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "leads admin read" on public.leads;
create policy "leads admin read" on public.leads for select
  using (public.is_admin());

drop policy if exists "leads admin update" on public.leads;
create policy "leads admin update" on public.leads for update
  using (public.is_admin());

drop policy if exists "media admin write" on storage.objects;
create policy "media admin write" on storage.objects for insert
  with check (bucket_id = 'media' and public.is_admin());

drop policy if exists "media admin update" on storage.objects;
create policy "media admin update" on storage.objects for update
  using (bucket_id = 'media' and public.is_admin());

drop policy if exists "media admin delete" on storage.objects;
create policy "media admin delete" on storage.objects for delete
  using (bucket_id = 'media' and public.is_admin());

-- migration-carfinder.sql policy
drop policy if exists "car requests admin all" on public.car_requests;
create policy "car requests admin all" on public.car_requests for all
  using (public.is_admin()) with check (public.is_admin());

-- migration-watch-social.sql policy
drop policy if exists "watches admin all" on public.vehicle_watches;
create policy "watches admin all" on public.vehicle_watches for all
  using (public.is_admin()) with check (public.is_admin());

-- migration-chat.sql policies (chat transcripts contain contact info)
drop policy if exists "chat convo admin" on public.chat_conversations;
create policy "chat convo admin" on public.chat_conversations for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "chat msg admin" on public.chat_messages;
create policy "chat msg admin" on public.chat_messages for all
  using (public.is_admin()) with check (public.is_admin());

-- migration-kb.sql policy
drop policy if exists "kb admin write" on public.ai_knowledge_base;
create policy "kb admin write" on public.ai_knowledge_base for all
  using (public.is_admin()) with check (public.is_admin());

-- migration-team.sql policy
drop policy if exists "team admin write" on public.team_members;
create policy "team admin write" on public.team_members for all
  using (public.is_admin()) with check (public.is_admin());

-- migration-pages.sql policy
drop policy if exists "pages admin write" on public.pages;
create policy "pages admin write" on public.pages for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------- 3. Customer profiles ----------
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  name         text not null default '',
  phone        text not null default '',
  contact_pref text not null default 'email' check (contact_pref in ('email','sms')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
alter table public.profiles enable row level security;

drop policy if exists "profiles own select" on public.profiles;
create policy "profiles own select" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles own insert" on public.profiles;
create policy "profiles own insert" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "profiles own update" on public.profiles;
create policy "profiles own update" on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists "profiles admin read" on public.profiles;
create policy "profiles admin read" on public.profiles for select using (public.is_admin());

-- Auto-create a profile row when an auth user is created (covers magic-link
-- users, who never run client-side sign-up code).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''))
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill for pre-existing users (the admins).
insert into public.profiles (id) select id from auth.users on conflict (id) do nothing;

-- ---------- 4. Saved vehicles (server-synced shortlist) ----------
create table if not exists public.saved_vehicles (
  user_id    uuid not null references auth.users(id) on delete cascade,
  vehicle_id text not null references public.vehicles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, vehicle_id)
);
alter table public.saved_vehicles enable row level security;
drop policy if exists "saved own all" on public.saved_vehicles;
create policy "saved own all" on public.saved_vehicles for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- 5. Link watches / requests / leads to accounts ----------
alter table public.vehicle_watches add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.car_requests    add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.leads           add column if not exists user_id uuid references auth.users(id) on delete set null;
create index if not exists idx_watches_user  on public.vehicle_watches(user_id);
create index if not exists idx_requests_user on public.car_requests(user_id);
create index if not exists idx_leads_user    on public.leads(user_id);

-- Own-row access for signed-in shoppers (coexists with the admin policies above).
drop policy if exists "watches own select" on public.vehicle_watches;
create policy "watches own select" on public.vehicle_watches for select using (auth.uid() = user_id);
drop policy if exists "watches own update" on public.vehicle_watches;
create policy "watches own update" on public.vehicle_watches for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "watches own delete" on public.vehicle_watches;
create policy "watches own delete" on public.vehicle_watches for delete using (auth.uid() = user_id);

drop policy if exists "car requests own select" on public.car_requests;
create policy "car requests own select" on public.car_requests for select using (auth.uid() = user_id);
drop policy if exists "car requests own update" on public.car_requests;
create policy "car requests own update" on public.car_requests for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "car requests own delete" on public.car_requests;
create policy "car requests own delete" on public.car_requests for delete using (auth.uid() = user_id);

drop policy if exists "leads own read" on public.leads;
create policy "leads own read" on public.leads for select using (auth.uid() = user_id);

-- Tighten public inserts so a shopper can't forge someone else's user_id.
drop policy if exists "leads public insert" on public.leads;
create policy "leads public insert" on public.leads for insert
  with check (user_id is null or user_id = auth.uid());

drop policy if exists "car requests public insert" on public.car_requests;
create policy "car requests public insert" on public.car_requests for insert
  with check (user_id is null or user_id = auth.uid());

drop policy if exists "watches public insert" on public.vehicle_watches;
create policy "watches public insert" on public.vehicle_watches for insert
  with check (user_id is null or user_id = auth.uid());

-- ---------- 6. Fix: leads.type check was missing newer lead types ----------
-- The app submits 'carfinder', 'service', and 'page' leads, which the original
-- constraint rejected silently. Relax it to the full set used by the code.
alter table public.leads drop constraint if exists leads_type_check;
alter table public.leads add constraint leads_type_check
  check (type in ('contact','testdrive','tradein','finance','video','delivery','carfinder','service','page','other'));

notify pgrst, 'reload schema';
