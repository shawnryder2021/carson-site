-- NOTE: admin policies here use public.is_admin() — run migration-garage.sql FIRST (it defines the function and the admin_users table).
-- Custom pages (admin page builder) + a starter Service Department page.
-- Run in the Supabase SQL Editor (project sfxswebjrzzdqtuzfmvd).

create table if not exists public.pages (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  title       text not null,
  description text not null default '',
  blocks      jsonb not null default '[]'::jsonb,
  published   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.pages enable row level security;
drop policy if exists "pages public read" on public.pages;
drop policy if exists "pages admin write" on public.pages;
create policy "pages public read"  on public.pages for select using (true);
create policy "pages admin write"  on public.pages for all using (public.is_admin()) with check (public.is_admin());

-- Starter Service Department page (edit it in Admin → Pages)
insert into public.pages (slug, title, description, blocks) values (
  'service',
  'Service Department',
  'Factory-trained service at Carson Exports in Dartmouth, NS. Book maintenance, repairs, tires, and more.',
  '[
    {"type":"html","html":"<h1>Service Department</h1><p class=\"lead\">Your car deserves the same care after the sale. Our factory-trained technicians keep every make and model running its best — with honest quotes and no surprises.</p>"},
    {"type":"html","html":"<h2>What we do</h2><ul><li><strong>Routine maintenance</strong> — oil changes, filters, fluids, multi-point inspections</li><li><strong>Brakes &amp; tires</strong> — pads, rotors, seasonal tire swaps and storage</li><li><strong>Diagnostics</strong> — check-engine lights, electrical, no-start</li><li><strong>Repairs</strong> — suspension, batteries, belts, and more</li><li><strong>Detailing</strong> — interior &amp; exterior packages</li></ul>"},
    {"type":"leadform","title":"Book a service appointment","subtitle":"Tell us what you need and we will confirm a time that works.","leadType":"service","fields":["name","phone","email","message"],"buttonText":"Request appointment"}
  ]'::jsonb
) on conflict (slug) do nothing;

notify pgrst, 'reload schema';
