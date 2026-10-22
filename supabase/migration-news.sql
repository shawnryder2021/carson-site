-- Run in the Supabase SQL Editor (after migration-garage.sql, which defines public.is_admin()).
-- Adds: News & Guides articles (/news), imported from the old carsonexports.com
-- (SM360) news section and editable in Admin → News & Guides.

create table if not exists public.articles (
  id               uuid primary key default gen_random_uuid(),
  slug             text unique not null,
  title            text not null,
  seo_title        text not null default '',          -- <title> (site suffix added by the layout)
  meta_description text not null default '',
  category         text not null,
  excerpt          text not null default '',
  body_html        text not null default '',          -- sanitized HTML
  image            text,                              -- featured image URL
  related_search   text,                              -- /used/[slug] page to promote, e.g. 'toyota-halifax'
  published        boolean not null default true,
  published_at     timestamptz,                       -- null for undated items (e.g. imported reviews)
  updated_at       timestamptz not null default now(),
  legacy_id        text unique,                       -- SM360 article id, for /en/news/view/... redirects
  legacy_url       text
);
create index if not exists articles_category_idx on public.articles (category);
create index if not exists articles_published_idx on public.articles (published_at desc);

alter table public.articles enable row level security;
drop policy if exists "articles public read" on public.articles;
create policy "articles public read" on public.articles for select using (published or public.is_admin());
drop policy if exists "articles admin write" on public.articles;
create policy "articles admin write" on public.articles for all using (public.is_admin()) with check (public.is_admin());
