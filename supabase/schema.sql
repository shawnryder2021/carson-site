-- NOTE: admin policies here use public.is_admin() — run migration-garage.sql FIRST (it defines the function and the admin_users table).
-- ============================================================
--  Carson Exports — Supabase schema
--  Run this in the Supabase SQL Editor (one time).
-- ============================================================

-- ---------- VEHICLES ----------
create table if not exists public.vehicles (
  id          text primary key,
  year        int  not null,
  make        text not null,
  model       text not null,
  price       int  not null,
  mileage     int  not null default 0,
  body        text not null check (body in ('Sedan','Coupe','SUV','Truck','Wagon')),
  fuel        text not null check (fuel in ('Gas','Hybrid','Electric')),
  drive       text not null check (drive in ('FWD','RWD','AWD')),
  exterior    text not null default '',
  interior    text not null default '',
  ai_summary  text not null default '',
  images      jsonb not null default '[]'::jsonb,
  status      text not null default 'available' check (status in ('available','sold','hidden')),
  featured    boolean not null default false,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- SITE SETTINGS (single row, id = 1) ----------
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

-- Migrations for existing databases (safe to re-run):
alter table public.site_settings add column if not exists hero_show_overlay boolean not null default true;
alter table public.site_settings add column if not exists hero_link_url text not null default '';

-- ---------- LEADS (form submissions) ----------
create table if not exists public.leads (
  id          uuid primary key default gen_random_uuid(),
  type        text not null check (type in ('contact','testdrive','tradein','finance','video','delivery','other')),
  name        text,
  email       text,
  phone       text,
  vehicle_id  text references public.vehicles(id) on delete set null,
  payload     jsonb not null default '{}'::jsonb,
  status      text not null default 'new' check (status in ('new','contacted','closed')),
  created_at  timestamptz not null default now()
);

-- ---------- GUIDES (blog) ----------
create table if not exists public.guides (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  title       text not null,
  category    text not null,
  excerpt     text not null default '',
  read_mins   int not null default 4,
  body        jsonb not null default '[]'::jsonb,   -- [{heading, text}]
  match_query text default '',
  published   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- NAVIGATION (admin-editable menu) ----------
create table if not exists public.nav_items (
  id          uuid primary key default gen_random_uuid(),
  label       text not null,
  href        text not null default '#',
  parent_id   uuid references public.nav_items(id) on delete cascade,
  sort_order  int not null default 0,
  auto_categories boolean not null default false,  -- top-level: render body-type submenu
  created_at  timestamptz not null default now()
);

-- ============================================================
--  ROW LEVEL SECURITY
--  Public can READ published content. Only authenticated
--  (logged-in admins) can write. Anyone can submit a lead.
-- ============================================================
alter table public.vehicles      enable row level security;
alter table public.site_settings enable row level security;
alter table public.leads         enable row level security;
alter table public.guides        enable row level security;
alter table public.nav_items     enable row level security;

-- nav_items: public read, admin write
create policy "nav public read"  on public.nav_items for select using (true);
create policy "nav admin write"  on public.nav_items for all using (public.is_admin()) with check (public.is_admin());

-- vehicles: public read, admin write
create policy "vehicles public read"  on public.vehicles for select using (true);
create policy "vehicles admin write"  on public.vehicles for all using (public.is_admin()) with check (public.is_admin());

-- site_settings: public read, admin write
create policy "settings public read"  on public.site_settings for select using (true);
create policy "settings admin write"  on public.site_settings for all using (public.is_admin()) with check (public.is_admin());

-- guides: public read, admin write
create policy "guides public read"     on public.guides for select using (true);
create policy "guides admin write"     on public.guides for all using (public.is_admin()) with check (public.is_admin());

-- leads: anyone can insert (public forms); only admins can read/update
create policy "leads public insert"    on public.leads for insert with check (true);
create policy "leads admin read"       on public.leads for select using (public.is_admin());
create policy "leads admin update"     on public.leads for update using (public.is_admin());

-- ============================================================
--  STORAGE: bucket for vehicle photos & hero images
-- ============================================================
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

create policy "media public read"   on storage.objects for select using (bucket_id = 'media');
create policy "media admin write"   on storage.objects for insert with check (bucket_id = 'media' and public.is_admin());
create policy "media admin update"  on storage.objects for update using (bucket_id = 'media' and public.is_admin());
create policy "media admin delete"  on storage.objects for delete using (bucket_id = 'media' and public.is_admin());
