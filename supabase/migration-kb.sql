-- NOTE: admin policies here use public.is_admin() — run migration-garage.sql FIRST (it defines the function and the admin_users table).
-- AI Knowledge Base for system prompts
-- Run in the Supabase SQL Editor.

create table if not exists public.ai_knowledge_base (
  id          uuid primary key default gen_random_uuid(),
  category    text not null check (category in ('about_carson', 'inventory_insights', 'market_data', 'policies', 'team', 'promotions')),
  title       text not null,
  content     text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_kb_category on public.ai_knowledge_base(category);

alter table public.ai_knowledge_base enable row level security;
drop policy if exists "kb public read" on public.ai_knowledge_base;
drop policy if exists "kb admin write" on public.ai_knowledge_base;
create policy "kb public read"  on public.ai_knowledge_base for select using (true);
create policy "kb admin write"  on public.ai_knowledge_base for all using (public.is_admin()) with check (public.is_admin());

-- Seed with templates (optional — delete and add your own via admin UI)
insert into public.ai_knowledge_base (category, title, content) values
  ('about_carson', 'Why Choose Carson Exports', 'Family-run dealership since 2008. We focus on transparency, quality, and zero-pressure buying. Every car passes a 142-point inspection. 7-day return policy. No hidden fees.'),
  ('policies', 'Financing Terms', 'Current rates: 5.9% - 8.5% depending on credit. Terms: 36-84 months. No money down options available. We handle all paperwork. Pre-approval takes 2 minutes.'),
  ('policies', '7-Day Return Policy', 'If you change your mind within 7 days or 250 km, bring it back. Full refund, no questions asked. This applies to all vehicles.'),
  ('market_data', 'Current Market Trends', 'Hybrid SUVs are hot right now in Atlantic Canada. Trucks holding strong. Sedans seeing slight price drops. Best deals on vehicles 30+ days on lot.'),
  ('inventory_insights', 'What''s Selling Well', 'Top sellers: Toyota RAV4, Honda CR-V, Ford F-150, Mazda CX-5. Least moving: Large sedans over $35k.'),
  ('team', 'Our Sales Team', 'We have specialists in trucks, families, first-time buyers, and eco-conscious shoppers. Ask for someone who matches your needs.')
on conflict do nothing;
